import { getSettings, saveSettings } from '../settings.js';
import { getDefaultThemeVars } from './tokens.js';

/** @typedef {import('./theme-store.js').FloatingMvuCustomTheme} FloatingMvuCustomTheme */

/**
 * @param {Record<string, string>} overrides
 * @returns {Record<string, string>}
 */
function vars(overrides) {
    return { ...getDefaultThemeVars(), ...overrides };
}

/** @type {FloatingMvuCustomTheme[]} */
export const PACK_THEMES = [
    {
        id: 'mvu-pack-ocean',
        name: '深海 Ocean',
        customCss: '',
        vars: vars({
            '--mvu-panel-bg': 'rgba(10, 22, 38, 0.94)',
            '--mvu-panel-border': 'rgba(56, 130, 190, 0.5)',
            '--mvu-panel-text': '#cfe9f8',
            '--mvu-header-bg': 'rgba(30, 90, 150, 0.22)',
            '--mvu-header-border': 'rgba(56, 130, 190, 0.35)',
            '--mvu-title-color': '#9ed0ff',
            '--mvu-icon-btn-color': '#9ed0ff',
            '--mvu-icon-btn-border': 'rgba(80, 160, 220, 0.55)',
            '--mvu-icon-btn-hover-bg': 'rgba(80, 170, 230, 0.22)',
            '--mvu-fab-bg': 'rgba(12, 28, 48, 0.9)',
            '--mvu-fab-border': 'rgba(80, 160, 220, 0.6)',
            '--mvu-group-root-bg': 'rgba(40, 120, 180, 0.08)',
            '--mvu-group-root-border': 'rgba(56, 130, 190, 0.45)',
            '--mvu-group-box-bg': 'rgba(30, 80, 130, 0.12)',
            '--mvu-group-box-border': 'rgba(70, 150, 210, 0.4)',
            '--mvu-group-title-color': '#b8e0ff',
            '--mvu-var-block-bg': 'rgba(255, 255, 255, 0.05)',
            '--mvu-var-block-border': 'rgba(70, 150, 210, 0.35)',
            '--mvu-var-block-hover-bg': 'rgba(80, 170, 230, 0.15)',
            '--mvu-var-block-text': '#dbefff',
            '--mvu-range-track-bg': 'rgba(0, 40, 70, 0.35)',
            '--mvu-range-fill-start': 'rgba(40, 160, 220, 0.75)',
            '--mvu-range-fill-end': 'rgba(100, 210, 255, 0.85)',
        }),
    },
    {
        id: 'mvu-pack-forest',
        name: '森语 Forest',
        customCss: '',
        vars: vars({
            '--mvu-panel-bg': 'rgba(14, 26, 18, 0.94)',
            '--mvu-panel-border': 'rgba(72, 140, 90, 0.48)',
            '--mvu-panel-text': '#d8eedc',
            '--mvu-header-bg': 'rgba(40, 100, 55, 0.2)',
            '--mvu-header-border': 'rgba(72, 140, 90, 0.35)',
            '--mvu-title-color': '#a8ddb0',
            '--mvu-icon-btn-color': '#a8ddb0',
            '--mvu-icon-btn-border': 'rgba(90, 160, 100, 0.55)',
            '--mvu-icon-btn-hover-bg': 'rgba(90, 180, 100, 0.2)',
            '--mvu-fab-bg': 'rgba(16, 32, 22, 0.9)',
            '--mvu-fab-border': 'rgba(90, 160, 100, 0.55)',
            '--mvu-group-root-bg': 'rgba(50, 110, 60, 0.08)',
            '--mvu-group-root-border': 'rgba(72, 140, 90, 0.42)',
            '--mvu-group-box-bg': 'rgba(40, 90, 50, 0.12)',
            '--mvu-group-box-border': 'rgba(85, 155, 95, 0.4)',
            '--mvu-group-title-color': '#b5e8bd',
            '--mvu-var-block-bg': 'rgba(255, 255, 255, 0.04)',
            '--mvu-var-block-border': 'rgba(85, 155, 95, 0.32)',
            '--mvu-var-block-hover-bg': 'rgba(90, 180, 100, 0.14)',
            '--mvu-var-block-text': '#e2f5e4',
            '--mvu-range-track-bg': 'rgba(10, 40, 20, 0.4)',
            '--mvu-range-fill-start': 'rgba(60, 160, 80, 0.7)',
            '--mvu-range-fill-end': 'rgba(120, 210, 130, 0.85)',
        }),
    },
    {
        id: 'mvu-pack-sunset',
        name: '暮橙 Sunset',
        customCss: '',
        vars: vars({
            '--mvu-panel-bg': 'rgba(32, 18, 14, 0.94)',
            '--mvu-panel-border': 'rgba(200, 110, 70, 0.48)',
            '--mvu-panel-text': '#ffe8d9',
            '--mvu-header-bg': 'rgba(180, 80, 40, 0.18)',
            '--mvu-header-border': 'rgba(200, 110, 70, 0.35)',
            '--mvu-title-color': '#ffc9a3',
            '--mvu-icon-btn-color': '#ffc9a3',
            '--mvu-icon-btn-border': 'rgba(220, 130, 80, 0.55)',
            '--mvu-icon-btn-hover-bg': 'rgba(230, 130, 70, 0.22)',
            '--mvu-fab-bg': 'rgba(36, 20, 16, 0.9)',
            '--mvu-fab-border': 'rgba(220, 130, 80, 0.55)',
            '--mvu-group-root-bg': 'rgba(200, 90, 50, 0.08)',
            '--mvu-group-root-border': 'rgba(200, 110, 70, 0.42)',
            '--mvu-group-box-bg': 'rgba(160, 70, 40, 0.12)',
            '--mvu-group-box-border': 'rgba(210, 120, 75, 0.38)',
            '--mvu-group-title-color': '#ffd4b0',
            '--mvu-var-block-bg': 'rgba(255, 255, 255, 0.05)',
            '--mvu-var-block-border': 'rgba(210, 120, 75, 0.32)',
            '--mvu-var-block-hover-bg': 'rgba(230, 130, 70, 0.16)',
            '--mvu-var-block-text': '#fff0e0',
            '--mvu-range-track-bg': 'rgba(50, 20, 10, 0.4)',
            '--mvu-range-fill-start': 'rgba(230, 120, 60, 0.75)',
            '--mvu-range-fill-end': 'rgba(255, 180, 100, 0.88)',
        }),
    },
    {
        id: 'mvu-pack-lilac',
        name: '熏衣 Lilac',
        customCss: '',
        vars: vars({
            '--mvu-panel-bg': 'rgba(24, 16, 32, 0.94)',
            '--mvu-panel-border': 'rgba(150, 100, 190, 0.48)',
            '--mvu-panel-text': '#ede4f8',
            '--mvu-header-bg': 'rgba(100, 60, 150, 0.2)',
            '--mvu-header-border': 'rgba(150, 100, 190, 0.35)',
            '--mvu-title-color': '#d4b8ff',
            '--mvu-icon-btn-color': '#d4b8ff',
            '--mvu-icon-btn-border': 'rgba(170, 120, 210, 0.55)',
            '--mvu-icon-btn-hover-bg': 'rgba(170, 120, 220, 0.22)',
            '--mvu-fab-bg': 'rgba(28, 18, 38, 0.9)',
            '--mvu-fab-border': 'rgba(170, 120, 210, 0.55)',
            '--mvu-group-root-bg': 'rgba(120, 70, 170, 0.08)',
            '--mvu-group-root-border': 'rgba(150, 100, 190, 0.42)',
            '--mvu-group-box-bg': 'rgba(90, 55, 130, 0.12)',
            '--mvu-group-box-border': 'rgba(160, 110, 200, 0.38)',
            '--mvu-group-title-color': '#e0c8ff',
            '--mvu-var-block-bg': 'rgba(255, 255, 255, 0.05)',
            '--mvu-var-block-border': 'rgba(160, 110, 200, 0.32)',
            '--mvu-var-block-hover-bg': 'rgba(170, 120, 220, 0.16)',
            '--mvu-var-block-text': '#f2eaff',
            '--mvu-range-track-bg': 'rgba(30, 15, 45, 0.4)',
            '--mvu-range-fill-start': 'rgba(140, 90, 200, 0.72)',
            '--mvu-range-fill-end': 'rgba(190, 140, 255, 0.85)',
        }),
    },
    {
        id: 'mvu-pack-paper',
        name: '素笺 Paper',
        customCss: '',
        vars: vars({
            '--mvu-panel-bg': 'rgba(252, 250, 246, 0.96)',
            '--mvu-panel-border': 'rgba(120, 100, 80, 0.28)',
            '--mvu-panel-text': '#2c2824',
            '--mvu-header-bg': 'rgba(80, 60, 40, 0.06)',
            '--mvu-header-border': 'rgba(120, 100, 80, 0.2)',
            '--mvu-title-color': '#3d342c',
            '--mvu-icon-btn-color': '#5c5046',
            '--mvu-icon-btn-border': 'rgba(120, 100, 80, 0.35)',
            '--mvu-icon-btn-hover-bg': 'rgba(200, 180, 160, 0.35)',
            '--mvu-fab-bg': 'rgba(255, 253, 248, 0.95)',
            '--mvu-fab-border': 'rgba(100, 80, 60, 0.35)',
            '--mvu-group-root-bg': 'rgba(80, 60, 40, 0.04)',
            '--mvu-group-root-border': 'rgba(120, 100, 80, 0.25)',
            '--mvu-group-box-bg': 'rgba(255, 255, 255, 0.65)',
            '--mvu-group-box-border': 'rgba(140, 120, 100, 0.28)',
            '--mvu-group-title-color': '#4a4038',
            '--mvu-var-block-bg': 'rgba(255, 255, 255, 0.85)',
            '--mvu-var-block-border': 'rgba(140, 120, 100, 0.22)',
            '--mvu-var-block-hover-bg': 'rgba(240, 230, 215, 0.95)',
            '--mvu-var-block-text': '#2c2824',
            '--mvu-range-track-bg': 'rgba(180, 160, 140, 0.25)',
            '--mvu-range-fill-start': 'rgba(90, 140, 200, 0.55)',
            '--mvu-range-fill-end': 'rgba(130, 180, 230, 0.7)',
        }),
    },
];

/**
 * 将扩展自带的 5 套主题合并进用户 settings（按 id 去重，不覆盖用户已改同名 id 主题）
 */
export function ensurePackThemes() {
    const settings = getSettings();
    if (!Array.isArray(settings.themes)) {
        settings.themes = [];
    }
    let changed = false;
    for (const pack of PACK_THEMES) {
        const index = settings.themes.findIndex(t => t.id === pack.id);
        if (index < 0) {
            settings.themes.push(structuredClone(pack));
            changed = true;
            continue;
        }
        const existing = settings.themes[index];
        if (!existing.vars || typeof existing.vars !== 'object') {
            existing.vars = {};
        }
        for (const [key, value] of Object.entries(pack.vars)) {
            if (existing.vars[key] === undefined) {
                existing.vars[key] = value;
                changed = true;
            }
        }
    }
    if (changed) {
        saveSettings();
    }
}
