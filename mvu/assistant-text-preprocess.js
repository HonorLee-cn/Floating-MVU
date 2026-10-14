/** @type {RegExp} Qwen 等模型的 think 块 */
const RE_MODEL_THINK_BLOCK = new RegExp('<' + 'think' + '>[\\s\\S]*?' + '<\\/' + 'think' + '>', 'gi');

/** 常见模型思考/推理块（正文里不应出现） */
const THINKING_BLOCK_PATTERNS = [
    /<think>[\s\S]*?<\/redacted_thinking>/gi,
    RE_MODEL_THINK_BLOCK,
    /<thinking>[\s\S]*?<\/thinking>/gi,
    /<reasoning>[\s\S]*?<\/reasoning>/gi,
];

/**
 * @param {string} text
 * @returns {{ text: string, strippedThinking: boolean }}
 */
export function stripModelThinkingBlocks(text) {
    let s = String(text ?? '');
    let strippedThinking = false;
    for (const pattern of THINKING_BLOCK_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(s)) {
            strippedThinking = true;
            pattern.lastIndex = 0;
            s = s.replace(pattern, '');
        }
    }
    return { text: s.trim(), strippedThinking };
}

/**
 * 去掉 prefill 续写末尾被截断的 `</floating-mvu` 残片（保留 JSON 闭合 `}`）。
 * @param {string} text
 */
function trimTruncatedCloseTagAfterJson(text) {
    const trimmed = String(text ?? '').trimEnd();
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace < 0) {
        return trimmed;
    }
    const tail = trimmed.slice(lastBrace + 1).trim();
    if (!tail || tail.startsWith('<')) {
        return trimmed.slice(0, lastBrace + 1);
    }
    return trimmed;
}

/**
 * Text Completion prefill 为 `<floating-mvu>{` 时，正文通常不含开标签且可能缺少首个 `{`。
 * @param {string} raw
 * @returns {{ text: string, repaired: boolean }}
 */
export function repairAssistantTextFromMvuPrefill(raw) {
    let s = String(raw ?? '');
    if (/<floating-mvu>/i.test(s)) {
        return { text: s, repaired: false };
    }

    s = trimTruncatedCloseTagAfterJson(s);
    const body = s.trimStart();
    const looksLikeJsonObjectBody = /^(?:\{[\s\S]*)?"[^"]+"\s*:/.test(body) || /^"[^"]+"\s*:/.test(body);
    if (!looksLikeJsonObjectBody) {
        return { text: s, repaired: false };
    }

    let inner = body.startsWith('{') ? body : `{${body}`;
    inner = trimTruncatedCloseTagAfterJson(inner);
    return {
        text: `<floating-mvu>${inner}`,
        repaired: true,
    };
}

/**
 * MVU 解析前规范化模型正文（去思考块、压缩多余空行）。
 * @param {string} raw
 * @returns {{ text: string, warnings: string[] }}
 */
export function preprocessMvuAssistantText(raw) {
    /** @type {string[]} */
    const warnings = [];
    const { text: withoutThinking, strippedThinking } = stripModelThinkingBlocks(raw);
    if (strippedThinking) {
        warnings.push('已从回复中移除 thinking/推理 块后再解析 MVU');
    }
    const text = withoutThinking.replace(/\n{3,}/g, '\n\n').trim();
    return { text, warnings };
}
