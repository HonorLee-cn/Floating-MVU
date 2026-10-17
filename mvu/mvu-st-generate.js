import { eventSource, event_types, generateRawData } from '../../../../../script.js';
import { floatingMvuDebugTrace } from '../debug-log.js';

/** MVU quiet 请求进行中计数（用于仅在本扩展发起时改 generation params） */
let mvuQuietGenDepth = 0;

/** 当前 MVU 尝试序号（0 起），由 callMvuUpdateApi 在每次 generate 前设置 */
let mvuQuietAttemptIndex = 0;

/** @param {number} index */
export function setMvuQuietAttemptIndex(index) {
    mvuQuietAttemptIndex = Math.max(0, Number(index) || 0);
}

const MVU_QUIET_TEMP_BY_ATTEMPT = [0.42, 0.32, 0.22, 0.15];
const MVU_QUIET_MIN_TOKENS = 48;

/**
 * @param {Record<string, unknown>} params
 */
export function onMvuTextCompletionSettingsReady(params) {
    if (mvuQuietGenDepth <= 0) {
        return;
    }
    // 聊天用 stop（\n角色名: 等）不适用于 MVU 工具调用，避免生成被误截断
    params.stop = [];
    params.stopping_strings = [];

    const attempt = mvuQuietAttemptIndex;
    const temp = MVU_QUIET_TEMP_BY_ATTEMPT[Math.min(attempt, MVU_QUIET_TEMP_BY_ATTEMPT.length - 1)];

    if (params.api_type === 'llamacpp') {
        // 工具调用：不走 DeepSeek 式「推理进 reasoning_content、正文为空」通道
        params.include_reasoning = false;
        params.reasoning_format = 'none';
        params.reasoning_budget_tokens = 0;
        params.reasoning_in_content = true;
        params.min_tokens = Math.max(Number(params.min_tokens) || 0, MVU_QUIET_MIN_TOKENS);
        params.temperature = temp;
        // MVU 对 slot 前缀缓存敏感，始终禁用 prompt 缓存
        params.cache_prompt = false;
    } else if (params.api_type) {
        // 其它 Text Completion 后端：尽量同样禁止「首 token 即结束」
        params.min_tokens = Math.max(Number(params.min_tokens) || 0, MVU_QUIET_MIN_TOKENS);
        params.temperature = temp;
    }

    floatingMvuDebugTrace('MVU quiet 生成参数', {
        attempt: attempt + 1,
        api_type: params.api_type,
        temperature: params.temperature,
        min_tokens: params.min_tokens,
        reasoning_format: params.reasoning_format,
        reasoning_budget_tokens: params.reasoning_budget_tokens,
        reasoning_in_content: params.reasoning_in_content,
        cache_prompt: params.cache_prompt,
    });
}

export function registerMvuQuietGenerationHooks() {
    eventSource.on(event_types.TEXT_COMPLETION_SETTINGS_READY, onMvuTextCompletionSettingsReady);
}

/**
 * @param {number} attemptIndex
 * @returns {string}
 */
function prefillForMvuAttempt(_attemptIndex) {
    // 首次即锚定 JSON，避免 llama 等直出 EOS（仅 1 token）后又整段 prompt 重跑
    return '<floating-mvu>{';
}

/**
 * 经 ST generateRawData 发起 MVU 更新：不拼接 Instruct 的助手尾缀，也不在 user 段前加 {{user}}: 。
 * @param {object} request
 * @param {string} request.systemPrompt
 * @param {string} request.userPrompt
 * @param {object} [options]
 * @param {number} [options.attemptIndex=0]
 */
export async function generateRawDataForMvuViaSillyTavern(request, options = {}) {
    const attemptIndex = Math.max(0, Number(options.attemptIndex) || 0);
    const combined = [
        String(request.systemPrompt ?? '').trim(),
        String(request.userPrompt ?? '').trim(),
    ].filter(Boolean).join('\n\n');

    setMvuQuietAttemptIndex(attemptIndex);
    mvuQuietGenDepth++;
    try {
        return await generateRawData({
            prompt: [{ role: 'system', content: combined }],
            instructOverride: true,
            prefill: prefillForMvuAttempt(attemptIndex),
        });
    } finally {
        mvuQuietGenDepth--;
        if (mvuQuietGenDepth <= 0) {
            setMvuQuietAttemptIndex(0);
        }
    }
}
