import { normalizeMvuPayloadForPreset } from './chat-variables.js';

const FLOATING_MVU_TAG_RE = /<floating-mvu>\s*([\s\S]*?)\s*<\/floating-mvu>/i;

/**
 * @param {string} text
 * @returns {{ jsonText: string | null, matched: boolean }}
 */
export function extractFloatingMvuJsonText(text) {
    const source = String(text ?? '');
    const match = source.match(FLOATING_MVU_TAG_RE);
    if (!match) {
        return { jsonText: null, matched: false };
    }
    return { jsonText: match[1].trim(), matched: true };
}

/**
 * @param {string} assistantText
 * @param {import('./schema.js').MvuPreset} preset
 */
export function parseFloatingMvuFromAssistantText(assistantText, preset) {
    const { jsonText, matched } = extractFloatingMvuJsonText(assistantText);
    if (!matched) {
        return {
            ok: false,
            error: '未找到 <floating-mvu>...</floating-mvu> 标签',
            jsonText: null,
            parsed: null,
            values: {},
            warnings: [],
        };
    }
    if (!jsonText) {
        return {
            ok: false,
            error: '标签存在但 JSON 内容为空',
            jsonText: '',
            parsed: null,
            values: {},
            warnings: [],
        };
    }

    /** @type {unknown} */
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (err) {
        return {
            ok: false,
            error: `JSON.parse 失败：${err instanceof Error ? err.message : String(err)}`,
            jsonText,
            parsed: null,
            values: {},
            warnings: [],
        };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
            ok: false,
            error: 'JSON 根节点必须是对象',
            jsonText,
            parsed,
            values: {},
            warnings: [],
        };
    }

    const { values, warnings } = normalizeMvuPayloadForPreset(preset, /** @type {Record<string, unknown>} */ (parsed));
    if (!Object.keys(values).length) {
        return {
            ok: false,
            error: '解析成功但未得到任何可写入的变量值',
            jsonText,
            parsed,
            values,
            warnings,
        };
    }

    return {
        ok: true,
        error: null,
        jsonText,
        parsed,
        values,
        warnings,
    };
}
