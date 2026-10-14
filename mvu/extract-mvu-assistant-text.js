import { extractMessageFromData, main_api } from '../../../../../script.js';

/**
 * @typedef {object} MvuAssistantExtractMeta
 * @property {boolean} usedFallback
 * @property {string[]} sources
 */

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function collectFallbackTextFields(raw) {
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const o = /** @type {Record<string, unknown>} */ (raw);
    const choice0 = o.choices?.[0];
    const choiceObj = choice0 && typeof choice0 === 'object'
        ? /** @type {Record<string, unknown>} */ (choice0)
        : null;
    const message = choiceObj?.message && typeof choiceObj.message === 'object'
        ? /** @type {Record<string, unknown>} */ (choiceObj.message)
        : null;

    /** @type {unknown[]} */
    const values = [
        o.content,
        message?.content,
        message?.reasoning_content,
        o.reasoning_content,
        o.reasoning,
        choiceObj?.reasoning,
        choiceObj?.thinking,
        choiceObj?.text,
        o.text,
        o.response,
    ];

    return values.filter(v => typeof v === 'string').map(v => String(v).trim()).filter(Boolean);
}

/**
 * @param {unknown} rawResponse
 * @param {string | null} [api]
 * @returns {{ text: string, usedFallback: boolean, sources: string[] }}
 */
export function extractMvuAssistantText(rawResponse, api = main_api) {
    /** @type {string[]} */
    const sources = [];
    const primary = extractMessageFromData(rawResponse, api ?? main_api);
    if (typeof primary === 'string' && primary.trim()) {
        sources.push('primary');
        return { text: primary, usedFallback: false, sources };
    }

    for (const fallback of collectFallbackTextFields(rawResponse)) {
        sources.push('fallback');
        return { text: fallback, usedFallback: true, sources };
    }

    return { text: typeof primary === 'string' ? primary : '', usedFallback: false, sources };
}
