import { saveMetadata } from '../../../../../script.js';
import { ensureChatBindingObject } from './chat-preset.js';
import {
    MAX_CANDIDATE_CONTENT_LENGTH,
    MVU_CANDIDATE_TYPES,
} from './schema.js';

/** @typedef {import('./schema.js').MvuCandidateItem} MvuCandidateItem */
/** @typedef {import('./schema.js').MvuCandidateType} MvuCandidateType */

const RESERVED_PAYLOAD_KEY = '_candidates';

/**
 * @returns {MvuCandidateItem[]}
 */
export function getChatCandidates() {
    const binding = ensureChatBindingObject();
    if (!Array.isArray(binding.candidates)) {
        binding.candidates = [];
    }
    return binding.candidates;
}

/**
 * @param {MvuCandidateItem[]} items
 */
export async function setChatCandidates(items) {
    const binding = ensureChatBindingObject();
    binding.candidates = items;
    await saveMetadata();
}

/**
 * @param {unknown} raw
 * @param {number} maxCount
 * @param {import('./schema.js').MvuCandidateType[]} [allowedTypes]
 * @returns {{ items: MvuCandidateItem[], warnings: string[] }}
 */
export function normalizeCandidatesFromPayload(raw, maxCount, allowedTypes) {
    /** @type {MvuCandidateItem[]} */
    const items = [];
    /** @type {string[]} */
    const warnings = [];

    if (raw === undefined || raw === null) {
        return { items, warnings };
    }
    if (!Array.isArray(raw)) {
        warnings.push('_candidates 必须是数组');
        return { items, warnings };
    }

    const limit = Math.max(1, Math.min(5, Math.floor(maxCount)));
    const allowedSet = Array.isArray(allowedTypes) && allowedTypes.length
        ? new Set(allowedTypes)
        : null;

    for (let i = 0; i < raw.length && items.length < limit; i++) {
        const entry = raw[i];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            warnings.push(`候选 #${i + 1} 不是对象，已跳过`);
            continue;
        }
        const typeRaw = /** @type {Record<string, unknown>} */ (entry).type;
        const contentRaw = /** @type {Record<string, unknown>} */ (entry).content;
        const type = String(typeRaw ?? '').trim();
        if (!MVU_CANDIDATE_TYPES.includes(/** @type {MvuCandidateType} */ (type))) {
            warnings.push(`候选 #${i + 1} type 非法：${type}`);
            continue;
        }
        if (allowedSet && !allowedSet.has(/** @type {MvuCandidateType} */ (type))) {
            warnings.push(`候选 #${i + 1} type「${type}」未在预设中启用，已跳过`);
            continue;
        }
        let content = String(contentRaw ?? '').trim();
        if (!content.length) {
            warnings.push(`候选 #${i + 1} content 为空，已跳过`);
            continue;
        }
        if (content.length > MAX_CANDIDATE_CONTENT_LENGTH) {
            warnings.push(`候选 #${i + 1} content 超过 ${MAX_CANDIDATE_CONTENT_LENGTH} 字，已截断`);
            content = content.slice(0, MAX_CANDIDATE_CONTENT_LENGTH);
        }
        items.push({ type: /** @type {MvuCandidateType} */ (type), content });
    }

    if (raw.length > limit) {
        warnings.push(`候选条数超过上限 ${limit}，已截断`);
    }

    return { items, warnings };
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function stripCandidatesFromMvuPayload(payload) {
    const copy = { ...payload };
    delete copy[RESERVED_PAYLOAD_KEY];
    return copy;
}

/**
 * 动作类 content 可能已带 `*…*` 或误用的 `**…**`，先归一化为纯文本再包一层 `*…*`。
 * @param {string} text
 * @returns {string}
 */
function unwrapActionCandidateCore(text) {
    let s = String(text ?? '').trim();
    if (!s.length) {
        return s;
    }
    let changed = true;
    while (changed) {
        changed = false;
        const bold = s.match(/^\*\*([\s\S]+)\*\*$/);
        if (bold) {
            s = bold[1].trim();
            changed = true;
            continue;
        }
        if (s.startsWith('*') && !s.startsWith('**') && s.endsWith('*') && !s.endsWith('**') && s.length > 2) {
            s = s.slice(1, -1).trim();
            changed = true;
        }
    }
    return s;
}

/**
 * @param {string} content
 * @param {MvuCandidateType} type
 * @returns {string}
 */
export function wrapCandidateContentForSendTextarea(content, type) {
    const text = String(content ?? '').trim();
    if (!text.length) {
        return '';
    }

    switch (type) {
        case 'plot':
            if (/^\[.+\]$/.test(text)) {
                return text;
            }
            return `[${text}]`;
        case 'action': {
            const core = unwrapActionCandidateCore(text);
            if (!core.length) {
                return '';
            }
            return `*${core}*`;
        }
        case 'dialogue': {
            const pairs = [
                ['"', '"'],
                ['“', '”'],
                ['「', '」'],
                ['『', '』'],
            ];
            for (const [open, close] of pairs) {
                if (text.startsWith(open) && text.endsWith(close) && text.length > open.length + close.length - 1) {
                    return text;
                }
            }
            const useChinese = /[\u4e00-\u9fff]/.test(text);
            if (useChinese) {
                return `“${text}”`;
            }
            return `"${text}"`;
        }
        case 'director':
            if (/^\(.+\)$/.test(text) || /^（.+）$/.test(text)) {
                return text;
            }
            if (/[\u4e00-\u9fff]/.test(text)) {
                return `（${text}）`;
            }
            return `(${text})`;
        default:
            return text;
    }
}

/**
 * @param {string} text
 */
export function fillSendTextarea(text) {
    const el = /** @type {HTMLTextAreaElement | null} */ (document.querySelector('#send_textarea'));
    if (!el) {
        return;
    }
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
