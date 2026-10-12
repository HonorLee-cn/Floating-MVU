/** 内置 default 主题 ID，不可编辑/删除 */
export const DEFAULT_THEME_ID = 'default';

export const MVU_PANEL_BG_IMAGE_VAR = '--mvu-panel-bg-image';
export const MVU_PANEL_BG_IMAGE_OPACITY_VAR = '--mvu-panel-bg-image-opacity';

/**
 * @typedef {object} MvuThemeTokenDef
 * @property {string} key
 * @property {string} cssVar
 * @property {string} label
 * @property {string} default
 */

/** @type {MvuThemeTokenDef[]} */
export const MVU_THEME_TOKEN_DEFS = [
    { key: 'panelBg', cssVar: '--mvu-panel-bg', label: '面板背景', default: 'rgba(20, 20, 20, 0.92)' },
    { key: 'panelBorder', cssVar: '--mvu-panel-border', label: '面板边框', default: 'rgba(128, 128, 128, 0.45)' },
    { key: 'panelText', cssVar: '--mvu-panel-text', label: '面板文字', default: '#e8e8e8' },
    { key: 'headerBg', cssVar: '--mvu-header-bg', label: '标题栏背景', default: 'rgba(255, 255, 255, 0.04)' },
    { key: 'headerBorder', cssVar: '--mvu-header-border', label: '标题栏分隔线', default: 'rgba(128, 128, 128, 0.35)' },
    { key: 'titleColor', cssVar: '--mvu-title-color', label: '标题文字', default: '#e8e8e8' },
    { key: 'iconBtnColor', cssVar: '--mvu-icon-btn-color', label: '标题按钮图标', default: '#e8e8e8' },
    { key: 'iconBtnBorder', cssVar: '--mvu-icon-btn-border', label: '标题按钮边框', default: 'rgba(128, 128, 128, 0.45)' },
    { key: 'iconBtnHoverBg', cssVar: '--mvu-icon-btn-hover-bg', label: '标题按钮悬停背景', default: 'rgba(255, 255, 255, 0.08)' },
    { key: 'fabBg', cssVar: '--mvu-fab-bg', label: '圆形按钮背景', default: 'rgba(20, 20, 20, 0.85)' },
    { key: 'fabBorder', cssVar: '--mvu-fab-border', label: '圆形按钮边框', default: 'rgba(128, 128, 128, 0.55)' },
    { key: 'groupRootBg', cssVar: '--mvu-group-root-bg', label: '根分组背景', default: 'rgba(255, 255, 255, 0.02)' },
    { key: 'groupRootBorder', cssVar: '--mvu-group-root-border', label: '根分组边框', default: 'rgba(128, 128, 128, 0.45)' },
    { key: 'groupBoxBg', cssVar: '--mvu-group-box-bg', label: '分组背景', default: 'rgba(255, 255, 255, 0.03)' },
    { key: 'groupBoxBorder', cssVar: '--mvu-group-box-border', label: '分组边框', default: 'rgba(128, 128, 128, 0.5)' },
    { key: 'groupTitleColor', cssVar: '--mvu-group-title-color', label: '分组标题', default: '#e8e8e8' },
    { key: 'varBlockBg', cssVar: '--mvu-var-block-bg', label: '变量块背景', default: 'rgba(255, 255, 255, 0.04)' },
    { key: 'varBlockBorder', cssVar: '--mvu-var-block-border', label: '变量块边框', default: 'rgba(128, 128, 128, 0.35)' },
    { key: 'varBlockHoverBg', cssVar: '--mvu-var-block-hover-bg', label: '变量块悬停', default: 'rgba(255, 255, 255, 0.08)' },
    { key: 'varBlockText', cssVar: '--mvu-var-block-text', label: '变量块文字', default: '#e8e8e8' },
    { key: 'rangeTrackBg', cssVar: '--mvu-range-track-bg', label: '进度条底（范围块）', default: 'rgba(255, 255, 255, 0.06)' },
    { key: 'rangeFillStart', cssVar: '--mvu-range-fill-start', label: '进度条渐变起点', default: 'rgba(100, 160, 255, 0.55)' },
    { key: 'rangeFillEnd', cssVar: '--mvu-range-fill-end', label: '进度条渐变终点', default: 'rgba(140, 200, 255, 0.65)' },
];

/**
 * @returns {Record<string, string>}
 */
export function getDefaultThemeVars() {
    /** @type {Record<string, string>} */
    const vars = {};
    for (const def of MVU_THEME_TOKEN_DEFS) {
        vars[def.cssVar] = def.default;
    }
    vars[MVU_PANEL_BG_IMAGE_VAR] = 'none';
    vars[MVU_PANEL_BG_IMAGE_OPACITY_VAR] = '0';
    return vars;
}

/**
 * @param {string} url
 * @returns {string}
 */
export function panelBgImageUrlToCss(url) {
    const trimmed = String(url ?? '').trim();
    if (!trimmed) {
        return 'none';
    }
    const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${escaped}")`;
}

/**
 * @param {string | undefined} cssValue
 * @returns {string}
 */
export function parsePanelBgImageUrl(cssValue) {
    if (!cssValue || cssValue.trim() === 'none') {
        return '';
    }
    const match = cssValue.match(/^url\(\s*"((?:\\.|[^"\\])*)"\s*\)$/);
    if (match) {
        return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    const simple = cssValue.match(/^url\(\s*['"]?(.*?)['"]?\s*\)$/);
    return simple ? simple[1] : '';
}

/**
 * @param {string | number | undefined} value
 * @returns {string}
 */
export function formatPanelBgImageOpacity(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return '0';
    }
    return String(Math.min(1, Math.max(0, n)));
}

/**
 * @param {string | undefined} cssValue
 * @returns {number}
 */
export function parsePanelBgImageOpacity(cssValue) {
    const n = Number(cssValue);
    if (!Number.isFinite(n)) {
        return 0;
    }
    return Math.min(1, Math.max(0, n));
}

/**
 * @param {Record<string, string> | undefined | null} stored
 * @returns {Record<string, string>}
 */
export function mergeThemeVars(stored) {
    const merged = getDefaultThemeVars();
    if (!stored || typeof stored !== 'object') {
        return merged;
    }
    for (const def of MVU_THEME_TOKEN_DEFS) {
        const value = stored[def.cssVar] ?? stored[def.key];
        if (typeof value === 'string' && value.trim()) {
            merged[def.cssVar] = value.trim();
        }
    }
    if (typeof stored[MVU_PANEL_BG_IMAGE_VAR] === 'string') {
        const raw = stored[MVU_PANEL_BG_IMAGE_VAR].trim();
        merged[MVU_PANEL_BG_IMAGE_VAR] = raw || 'none';
    }
    if (stored[MVU_PANEL_BG_IMAGE_OPACITY_VAR] !== undefined && stored[MVU_PANEL_BG_IMAGE_OPACITY_VAR] !== null) {
        merged[MVU_PANEL_BG_IMAGE_OPACITY_VAR] = formatPanelBgImageOpacity(stored[MVU_PANEL_BG_IMAGE_OPACITY_VAR]);
    }
    return merged;
}
