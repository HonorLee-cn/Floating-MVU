import {
    preprocessMvuAssistantText,
    repairAssistantTextFromMvuPrefill,
} from './assistant-text-preprocess.js';
import {
    normalizeCandidatesFromPayload,
    stripCandidatesFromMvuPayload,
} from './chat-candidates.js';
import { normalizeMvuPayloadForPreset } from './chat-variables.js';
import {
    getPresetEnabledCandidateTypes,
    getPresetMaxCandidateCount,
    isPresetCandidatesEnabled,
} from './schema.js';

const FLOATING_MVU_STRICT_RE = /<floating-mvu>\s*([\s\S]*?)\s*<\/floating-mvu>/gi;
const FLOATING_MVU_OPEN_RE = /<floating-mvu>\s*/gi;

/**
 * @param {string} jsonText
 * @returns {boolean}
 */
function isParseableJsonObject(jsonText) {
    try {
        const parsed = JSON.parse(jsonText);
        return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
    } catch {
        return false;
    }
}

/**
 * @param {string} source
 * @param {number} openIndex
 * @returns {string | null}
 */
function extractBalancedJsonObjectFromOpenIndex(source, openIndex) {
    const slice = source.slice(openIndex);
    const openMatch = slice.match(/^<floating-mvu>\s*/i);
    if (!openMatch) {
        return null;
    }
    const rest = slice.slice(openMatch[0].length);
    const firstBrace = rest.indexOf('{');
    if (firstBrace < 0) {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = firstBrace; i < rest.length; i++) {
        const ch = rest[i];
        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') {
            depth++;
            continue;
        }
        if (ch === '}') {
            depth--;
            if (depth === 0) {
                return rest.slice(firstBrace, i + 1);
            }
        }
    }

    return null;
}

/**
 * @param {string} text 已 preprocess 的正文
 * @returns {{ jsonText: string | null, matched: boolean, relaxed?: boolean, warnings: string[] }}
 */
export function extractFloatingMvuJsonText(text) {
    const source = String(text ?? '');
    /** @type {string[]} */
    const warnings = [];

    FLOATING_MVU_STRICT_RE.lastIndex = 0;
    const strictMatches = [...source.matchAll(FLOATING_MVU_STRICT_RE)];
    if (strictMatches.length > 1) {
        warnings.push(`检测到 ${strictMatches.length} 组完整的 <floating-mvu>…</floating-mvu>，已采用最后一组（忽略模型「修正」前的错误段落）`);
    }
    if (strictMatches.length) {
        const last = strictMatches[strictMatches.length - 1];
        return {
            jsonText: last[1].trim(),
            matched: true,
            warnings,
        };
    }

    FLOATING_MVU_OPEN_RE.lastIndex = 0;
    const openMatches = [...source.matchAll(FLOATING_MVU_OPEN_RE)];
    /** @type {{ jsonText: string, index: number }[]} */
    const relaxedCandidates = [];
    for (const m of openMatches) {
        if (m.index === undefined) {
            continue;
        }
        const json = extractBalancedJsonObjectFromOpenIndex(source, m.index);
        if (json && isParseableJsonObject(json)) {
            relaxedCandidates.push({ jsonText: json.trim(), index: m.index });
        }
    }

    if (relaxedCandidates.length > 1) {
        warnings.push(`检测到 ${relaxedCandidates.length} 处 <floating-mvu> 开标签，已采用最后一处可解析 JSON`);
    }
    if (relaxedCandidates.length) {
        const last = relaxedCandidates[relaxedCandidates.length - 1];
        return {
            jsonText: last.jsonText,
            matched: true,
            relaxed: true,
            warnings,
        };
    }

    return { jsonText: null, matched: false, warnings };
}

/**
 * @param {string} assistantText
 * @param {import('./schema.js').MvuPreset} preset
 */
export function parseFloatingMvuFromAssistantText(assistantText, preset) {
    const { text: repairedText, repaired: prefillRepaired } = repairAssistantTextFromMvuPrefill(assistantText);
    const { text: normalizedText, warnings: preprocessWarnings } = preprocessMvuAssistantText(repairedText);
    if (prefillRepaired) {
        preprocessWarnings.push('检测到 prefill 续写片段（无 <floating-mvu> 开标签），已补全标签与 JSON 起始 { 后再解析');
    }
    const { jsonText, matched, relaxed, warnings: extractWarnings } = extractFloatingMvuJsonText(normalizedText);
    /** @type {string[]} */
    const extractWarningsAll = [...preprocessWarnings, ...extractWarnings];
    if (relaxed) {
        extractWarningsAll.push('未找到标准 </floating-mvu> 闭合标签，已从 <floating-mvu> 后按 JSON 对象容错提取');
    }

    if (!matched) {
        return {
            ok: false,
            error: '未找到 <floating-mvu>...</floating-mvu> 标签',
            jsonText: null,
            parsed: null,
            values: {},
            candidates: undefined,
            shouldUpdateCandidates: false,
            warnings: extractWarningsAll,
        };
    }
    if (!jsonText) {
        return {
            ok: false,
            error: '标签存在但 JSON 内容为空',
            jsonText: '',
            parsed: null,
            values: {},
            candidates: undefined,
            shouldUpdateCandidates: false,
            warnings: extractWarningsAll,
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
            candidates: undefined,
            shouldUpdateCandidates: false,
            warnings: extractWarningsAll,
        };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
            ok: false,
            error: 'JSON 根节点必须是对象',
            jsonText,
            parsed,
            values: {},
            candidates: undefined,
            shouldUpdateCandidates: false,
            warnings: extractWarningsAll,
        };
    }

    const payload = /** @type {Record<string, unknown>} */ (parsed);
    const maxCount = getPresetMaxCandidateCount(preset);
    const wantCandidates = isPresetCandidatesEnabled(preset);

    /** @type {import('./schema.js').MvuCandidateItem[] | undefined} */
    let candidates;
    /** @type {boolean} */
    let shouldUpdateCandidates = false;
    /** @type {string[]} */
    const candidateWarnings = [];

    if (wantCandidates && '_candidates' in payload) {
        shouldUpdateCandidates = true;
        const normalized = normalizeCandidatesFromPayload(
            payload._candidates,
            maxCount,
            getPresetEnabledCandidateTypes(preset),
        );
        candidates = normalized.items;
        candidateWarnings.push(...normalized.warnings);
    }

    const variablePayload = stripCandidatesFromMvuPayload(payload);
    const { values, warnings } = normalizeMvuPayloadForPreset(preset, variablePayload);
    const warningsAll = [...extractWarningsAll, ...warnings, ...candidateWarnings];

    if (!Object.keys(values).length) {
        return {
            ok: false,
            error: '解析成功但未得到任何可写入的变量值',
            jsonText,
            parsed,
            values,
            candidates,
            shouldUpdateCandidates,
            warnings: warningsAll,
        };
    }

    return {
        ok: true,
        error: null,
        jsonText,
        parsed,
        values,
        candidates,
        shouldUpdateCandidates,
        warnings: warningsAll,
    };
}
