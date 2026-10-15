/**
 * @param {string} cssColor
 * @returns {string}
 */
export function toColorInputValue(cssColor) {
    const hex = String(cssColor ?? '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return hex;
    }
    const m = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) {
        return '#808080';
    }
    const r = Number(m[1]).toString(16).padStart(2, '0');
    const g = Number(m[2]).toString(16).padStart(2, '0');
    const b = Number(m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @returns {string}
 */
export function getVariableRangeFillStyleAttr(variable) {
    const trimmed = String(variable.rangeFillColor ?? '').trim();
    const color = /^#[0-9a-fA-F]{6}$/i.test(trimmed) || /^rgba?\(/i.test(trimmed) ? trimmed : null;
    if (!color) {
        return '';
    }
    const safe = color.replace(/"/g, '');
    return ` style="--mvu-range-fill-start: ${safe}; --mvu-range-fill-end: ${safe};"`;
}
