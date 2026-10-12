import { name1, name2, substituteParams } from '../../../../../script.js';

/**
 * 文本变量值中的 {user}/{char} 与 ST 宏 {{user}}/{{char}} 替换为当前人设名与角色名。
 * @param {string} text
 * @returns {string}
 */
export function applyMvuTextVariableMacros(text) {
    if (text === null || text === undefined) {
        return '';
    }
    let out = substituteParams(String(text));
    const userLabel = String(name1 ?? '').trim();
    const charLabel = String(name2 ?? '').trim();
    out = out.replace(/\{user\}/gi, userLabel);
    out = out.replace(/\{char\}/gi, charLabel);
    return out;
}
