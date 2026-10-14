import { saveMetadata } from '../../../../../script.js';
import { ensureChatBindingObject } from './chat-preset.js';
import { getPresetVariables, getVariableRangeBounds } from './schema.js';
import { applyMvuTextVariableMacros } from './text-macros.js';
import { recordMvuSnapshotAtAnchor } from './variable-history.js';

/** @typedef {Record<string, string | number>} MvuChatVariableValues */

/**
 * @returns {MvuChatVariableValues}
 */
export function getChatVariableValues() {
    const binding = ensureChatBindingObject();
    return binding.values;
}

/**
 * @param {import('./schema.js').MvuVariableNode} variable
 * @param {unknown} raw
 * @returns {string | number | null}
 */
function normalizeSingleValue(variable, raw) {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (variable.varType === 'range') {
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(num)) {
            return null;
        }
        const { min, max } = getVariableRangeBounds(variable);
        return Math.min(max, Math.max(min, Math.round(num)));
    }
    if (variable.varType === 'longtext' || variable.varType === 'text') {
        let text = applyMvuTextVariableMacros(String(raw).trim());
        const maxLen = variable.textMaxLength;
        if (variable.varType === 'longtext' && typeof maxLen === 'number' && maxLen > 0 && text.length > maxLen) {
            text = text.slice(0, maxLen);
        }
        return text;
    }
    return null;
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @param {Record<string, unknown>} payload
 * @returns {{ values: MvuChatVariableValues, warnings: string[] }}
 */
export function normalizeMvuPayloadForPreset(preset, payload) {
    /** @type {MvuChatVariableValues} */
    const values = {};
    /** @type {string[]} */
    const warnings = [];
    const variables = getPresetVariables(preset).filter(v => v.varType !== 'image');
    const knownNames = new Set(variables.map(v => String(v.name ?? '').trim()).filter(Boolean));

    for (const key of Object.keys(payload)) {
        if (key === '_candidates') {
            continue;
        }
        if (!knownNames.has(key)) {
            warnings.push(`忽略未知变量名：${key}`);
        }
    }

    for (const variable of variables) {
        const name = String(variable.name ?? '').trim();
        if (!name) {
            continue;
        }
        if (!(name in payload)) {
            continue;
        }
        const normalized = normalizeSingleValue(variable, payload[name]);
        if (normalized === null) {
            warnings.push(`变量「${name}」的值无法解析，已跳过`);
            continue;
        }
        values[name] = normalized;
    }

    return { values, warnings };
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @param {MvuChatVariableValues} patch
 * @param {object} [options]
 * @param {number} [options.anchorMessageIndex] 本次更新对应的角色消息层（索引）
 * @param {import('./schema.js').MvuCandidateItem[] | null | undefined} [options.candidates] 变量写入成功时一并更新；undefined 表示不改动候选
 */
export async function mergeChatVariableValues(preset, patch, options = {}) {
    const binding = ensureChatBindingObject();
    const { values } = normalizeMvuPayloadForPreset(preset, patch);
    const merged = { ...binding.values, ...values };

    const anchorIndex = options.anchorMessageIndex;
    const candidates = options.candidates;
    if (typeof anchorIndex === 'number' && anchorIndex >= 0) {
        await recordMvuSnapshotAtAnchor(anchorIndex, merged, candidates);
        return;
    }

    binding.values = merged;
    if (candidates !== undefined) {
        binding.candidates = Array.isArray(candidates) ? candidates : [];
    }
    await saveMetadata();
}
