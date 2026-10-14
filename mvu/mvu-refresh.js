import {
    floatingMvuDebugError,
    floatingMvuDebugLog,
    floatingMvuDebugWarn,
} from '../debug-log.js';
import { t } from '../i18n/index.js';
import { getBoundPresetForChat } from './chat-preset.js';
import { getChatVariableValues, mergeChatVariableValues } from './chat-variables.js';
import { getDefaultMvuAnchorMessageIndex } from './variable-history.js';
import { buildMvuUpdateRequestLogForCurrentSettings, callMvuUpdateApi } from './mvu-update-api.js';
import { buildMvuUpdateRequest } from './mvu-update-request.js';
import { preprocessMvuAssistantText } from './assistant-text-preprocess.js';
import { parseFloatingMvuFromAssistantText } from './parse-floating-mvu.js';
import { refreshCandidateList, setCandidatesUiHiddenUntilNextUpdate } from '../ui/candidate-list.js';
import { refreshPanelView } from '../ui/panel-views.js';
import { setMvuUpdateIndicator } from '../ui/update-indicator.js';

/** @type {boolean} */
let refreshInFlight = false;

export function isMvuRefreshInFlight() {
    return refreshInFlight;
}

/**
 * 面板刷新按钮：装配参数、非 streaming 调用、解析并写入聊天变量。
 */
/**
 * @param {object} [options]
 * @param {number} [options.anchorMessageIndex] 自动更新时传入触发消息索引
 */
export async function runMvuPanelRefresh(options = {}) {
    const preset = getBoundPresetForChat();
    if (!preset) {
        floatingMvuDebugWarn(t('err.noPresetBound'));
        return;
    }
    if (refreshInFlight) {
        floatingMvuDebugWarn(t('err.refreshInFlight'));
        return;
    }

    refreshInFlight = true;
    setMvuUpdateIndicator(true);
    try {
        const anchorMessageIndex = typeof options.anchorMessageIndex === 'number'
            ? options.anchorMessageIndex
            : getDefaultMvuAnchorMessageIndex();

        const currentValues = { ...getChatVariableValues() };
        const request = buildMvuUpdateRequest(preset, { currentValues });

        floatingMvuDebugLog('========== 1. 请求参数（非 streaming）==========');
        floatingMvuDebugLog('MVU 装配摘要', {
            presetId: preset.id,
            presetName: preset.name,
            anchorMessageIndex,
            contextMessageCount: request.contextMessageCount,
            stream: request.stream,
            currentValues,
            hasCharacterContext: Boolean(request.characterContextBlock?.trim()),
        });
        floatingMvuDebugLog('角色上下文块:\n', request.characterContextBlock);
        floatingMvuDebugLog('systemPrompt:\n', request.systemPrompt);
        floatingMvuDebugLog('userPrompt（完整）:\n', request.userPrompt);
        floatingMvuDebugLog('完整 API 查询参数:', buildMvuUpdateRequestLogForCurrentSettings(request));

        const apiResult = await callMvuUpdateApi(request);

        floatingMvuDebugLog('========== 2. API 完整返回 ==========');
        floatingMvuDebugLog('provider:', apiResult.provider);
        floatingMvuDebugLog('请求日志（含 URL/body 或 generateRaw 参数）:', apiResult.requestLog);
        floatingMvuDebugLog('rawResponse（完整）:', apiResult.rawResponse);
        floatingMvuDebugLog('assistantText（提取后）:\n', apiResult.assistantText);
        if (apiResult.assistantTextMeta) {
            floatingMvuDebugLog('assistantText 提取来源:', apiResult.assistantTextMeta);
        }
        if (!String(apiResult.assistantText ?? '').trim()) {
            floatingMvuDebugWarn(t('err.emptyMvuResponse'), {
                attemptCount: apiResult.attemptCount,
                tokens_predicted: apiResult.rawResponse?.tokens_predicted,
                stop_type: apiResult.rawResponse?.stop_type,
                generation_settings: apiResult.rawResponse?.generation_settings,
            });
        }
        const preprocessed = preprocessMvuAssistantText(apiResult.assistantText);
        floatingMvuDebugLog('assistantText（解析用，已去掉 thinking 等）:\n', preprocessed.text);

        const parseResult = parseFloatingMvuFromAssistantText(apiResult.assistantText, preset);

        floatingMvuDebugLog('========== 3. JSON 格式化与解析 ==========');
        floatingMvuDebugLog('标签内 JSON 原文:', parseResult.jsonText);
        if (parseResult.parsed !== null) {
            floatingMvuDebugLog('JSON.parse 结果（对象）:', parseResult.parsed);
            try {
                floatingMvuDebugLog('JSON 格式化:\n', JSON.stringify(parseResult.parsed, null, 2));
            } catch {
                // ignore
            }
        }
        if (parseResult.warnings.length) {
            floatingMvuDebugWarn('解析警告:', parseResult.warnings);
        }

        floatingMvuDebugLog('========== 4. 写入聊天变量与面板 ==========');
        if (!parseResult.ok) {
            floatingMvuDebugError('解析失败:', parseResult.error);
            return;
        }

        floatingMvuDebugLog('规范化后的待写入值:', parseResult.values);
        const candidatesToWrite = parseResult.shouldUpdateCandidates ? parseResult.candidates : undefined;

        await mergeChatVariableValues(preset, parseResult.values, {
            anchorMessageIndex: anchorMessageIndex >= 0 ? anchorMessageIndex : undefined,
            candidates: candidatesToWrite,
        });
        const stored = getChatVariableValues();
        floatingMvuDebugLog('写入后 chat_metadata.floating_mvu.values:', stored);

        if (candidatesToWrite !== undefined) {
            setCandidatesUiHiddenUntilNextUpdate(false);
        }
        refreshPanelView();
        refreshCandidateList();
        floatingMvuDebugLog('面板已 refreshPanelView()');
    } catch (err) {
        floatingMvuDebugError('MVU 刷新失败:', err);
        if (err && typeof err === 'object' && 'response' in err) {
            floatingMvuDebugError('错误响应体:', /** @type {{ response?: unknown }} */ (err).response);
        }
    } finally {
        refreshInFlight = false;
        setMvuUpdateIndicator(false);
    }
}
