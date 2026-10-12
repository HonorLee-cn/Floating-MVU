import { ROOT_ID, THEME_VAR_SCOPE } from '../settings.js';
import { getActiveThemeId, resolveTheme } from './theme-store.js';

const STYLE_ID = 'floating_mvu_theme_style';

/** @type {{ vars: Record<string, string>, customCss: string } | null} */
let previewOverride = null;

/**
 * @param {Record<string, string>} vars
 * @param {string} customCss
 * @param {string} themeId
 */
function writeThemeStyle(vars, customCss, themeId) {
    let $style = $(`#${STYLE_ID}`);
    if (!$style.length) {
        $style = $('<style>', { id: STYLE_ID });
        $('head').append($style);
    }

    const varLines = Object.entries(vars).map(([name, value]) => `    ${name}: ${value};`);
    const scope = THEME_VAR_SCOPE;
    let css = `${scope} {\n${varLines.join('\n')}\n}\n`;
    if (customCss.trim()) {
        css += `\n/* Floating MVU custom theme: ${themeId} */\n${customCss.trim()}\n`;
    }
    $style.text(css);

    const root = document.getElementById(ROOT_ID);
    if (root) {
        root.dataset.themeId = themeId;
    }
}

/**
 * @param {{ vars?: Record<string, string>, customCss?: string } | null} override
 */
export function setThemePreviewOverride(override) {
    previewOverride = override;
}

export function clearThemePreviewOverride() {
    previewOverride = null;
}

export function applyActiveTheme() {
    if (previewOverride) {
        writeThemeStyle(
            previewOverride.vars ?? {},
            previewOverride.customCss ?? '',
            getActiveThemeId(),
        );
        return;
    }
    const theme = resolveTheme(getActiveThemeId());
    writeThemeStyle(theme.vars, theme.customCss, theme.id);
}

/**
 * @param {string} themeId
 * @param {Record<string, string>} vars
 * @param {string} customCss
 */
export function applyThemeLive(themeId, vars, customCss) {
    writeThemeStyle(vars, customCss, themeId);
}
