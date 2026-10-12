import { uuidv4 } from '../../../../utils.js';
import { isActiveChatContext } from '../chat-context.js';
import { clearChatThemeIfMatches, getChatThemeId, setChatThemeId } from '../mvu/chat-preset.js';
import { t } from '../i18n/index.js';
import { getSettings, saveSettings } from '../settings.js';
import { DEFAULT_THEME_ID, getDefaultThemeVars, mergeThemeVars } from './tokens.js';

/**
 * @typedef {object} FloatingMvuCustomTheme
 * @property {string} id
 * @property {string} name
 * @property {Record<string, string>} vars
 * @property {string} customCss
 */

/**
 * @returns {FloatingMvuCustomTheme[]}
 */
export function listCustomThemes() {
    const settings = getSettings();
    if (!Array.isArray(settings.themes)) {
        settings.themes = [];
    }
    return settings.themes;
}

/**
 * @param {string | null | undefined} themeId
 * @returns {string}
 */
function resolveStoredThemeId(themeId) {
    if (themeId === DEFAULT_THEME_ID || !themeId) {
        return DEFAULT_THEME_ID;
    }
    if (listCustomThemes().some(t => t.id === themeId)) {
        return themeId;
    }
    return DEFAULT_THEME_ID;
}

/**
 * @returns {string}
 */
export function getActiveThemeId() {
    if (!isActiveChatContext()) {
        return DEFAULT_THEME_ID;
    }
    return resolveStoredThemeId(getChatThemeId());
}

/**
 * @param {string} themeId
 */
export async function setActiveThemeId(themeId) {
    if (!isActiveChatContext()) {
        return;
    }
    const resolved = resolveStoredThemeId(themeId);
    const toStore = resolved === DEFAULT_THEME_ID ? null : resolved;
    await setChatThemeId(toStore);
}

/**
 * @param {string} themeId
 * @returns {FloatingMvuCustomTheme | null}
 */
export function getCustomThemeById(themeId) {
    if (themeId === DEFAULT_THEME_ID) {
        return null;
    }
    return listCustomThemes().find(t => t.id === themeId) ?? null;
}

/**
 * @param {string} themeId
 * @returns {{ id: string, name: string, vars: Record<string, string>, customCss: string, isBuiltin: boolean }}
 */
export function resolveTheme(themeId) {
    if (themeId === DEFAULT_THEME_ID) {
        return {
            id: DEFAULT_THEME_ID,
            name: 'default',
            vars: getDefaultThemeVars(),
            customCss: '',
            isBuiltin: true,
        };
    }
    const custom = getCustomThemeById(themeId);
    if (!custom) {
        return resolveTheme(DEFAULT_THEME_ID);
    }
    return {
        id: custom.id,
        name: custom.name,
        vars: mergeThemeVars(custom.vars),
        customCss: typeof custom.customCss === 'string' ? custom.customCss : '',
        isBuiltin: false,
    };
}

/**
 * @param {FloatingMvuCustomTheme} theme
 * @returns {FloatingMvuCustomTheme}
 */
export function upsertCustomTheme(theme) {
    const settings = getSettings();
    if (!Array.isArray(settings.themes)) {
        settings.themes = [];
    }
    const normalized = {
        id: theme.id || uuidv4(),
        name: String(theme.name ?? '').trim() || t('defaults.unnamedTheme'),
        vars: mergeThemeVars(theme.vars),
        customCss: typeof theme.customCss === 'string' ? theme.customCss : '',
    };
    const index = settings.themes.findIndex(t => t.id === normalized.id);
    if (index >= 0) {
        settings.themes[index] = normalized;
    } else {
        settings.themes.push(normalized);
    }
    saveSettings();
    return normalized;
}

/**
 * @param {string} themeId
 * @returns {boolean}
 */
export function deleteCustomTheme(themeId) {
    if (themeId === DEFAULT_THEME_ID) {
        return false;
    }
    const settings = getSettings();
    if (!Array.isArray(settings.themes)) {
        return false;
    }
    const before = settings.themes.length;
    settings.themes = settings.themes.filter(t => t.id !== themeId);
    if (settings.themes.length === before) {
        return false;
    }
    void clearChatThemeIfMatches(themeId);
    saveSettings();
    return true;
}

/**
 * @param {string} sourceThemeId
 * @returns {FloatingMvuCustomTheme}
 */
export function duplicateTheme(sourceThemeId) {
    const source = resolveTheme(sourceThemeId);
    return upsertCustomTheme({
        id: uuidv4(),
        name: source.name === 'default'
            ? t('theme.copyNameDefault')
            : t('theme.copyNameSuffix', { name: source.name }),
        vars: { ...source.vars },
        customCss: source.customCss,
    });
}

/**
 * @returns {{ id: string, name: string, isBuiltin: boolean }[]}
 */
export function listThemeSummaries() {
    const list = [{ id: DEFAULT_THEME_ID, name: 'default', isBuiltin: true }];
    for (const t of listCustomThemes()) {
        list.push({ id: t.id, name: t.name, isBuiltin: false });
    }
    return list;
}
