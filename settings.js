import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';
import { fetchModelList } from './api/client.js';
import { getExtensionResourcePrefix } from './extension-path.js';
import { applySettingsPanelI18n, t } from './i18n/index.js';

export const SETTINGS_KEY = 'floating_mvu';
export const CONTAINER_ID = 'floating_mvu_container';
export const ROOT_ID = 'floating_mvu_root';
/** 注入 --mvu-* 主题变量的 DOM 作用域（浮动根 + 预设编辑弹窗） */
export const THEME_VAR_SCOPE = `#${ROOT_ID}, .floating-mvu-preset-editor`;
export const FAB_ID = 'floating_mvu_fab';
export const PANEL_ID = 'floating_mvu_panel';

/** @typedef {{ top?: number | string, left?: number | string, bottom?: number | string, right?: number | string }} FloatingMvuPosition */

/**
 * @typedef {'manual' | 'select'} FloatingMvuModelMode
 */

/**
 * @typedef {object} FloatingMvuCustomApiSettings
 * @property {boolean} enabled
 * @property {string} baseUrl
 * @property {string} apiKey
 * @property {FloatingMvuModelMode} modelMode
 * @property {string} model
 * @property {string[]} modelList
 */

/**
 * @typedef {object} FloatingMvuSettings
 * @property {boolean} enabled
 * @property {boolean} autoShowInChat
 * @property {boolean} defaultExpandPanel
 * @property {boolean} debugMode
 * @property {'zh' | 'en'} locale
 * @property {boolean} panelExpanded
 * @property {FloatingMvuPosition | null} fab
 * @property {FloatingMvuPosition | null} panel
 * @property {{ width: number, height: number } | null} panelSize
 * @property {FloatingMvuCustomApiSettings} customApi
 * @property {import('./mvu/schema.js').MvuPreset[]} presets
 * @property {import('./theme/theme-store.js').FloatingMvuCustomTheme[]} themes
 * @property {string} activeThemeId
 */

export const PANEL_CONTENT_ID = 'floating_mvu_panel_content';

/** @type {FloatingMvuCustomApiSettings} */
const defaultCustomApi = {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    modelMode: 'manual',
    model: '',
    modelList: [],
};

/** @type {FloatingMvuSettings} */
const defaultSettings = {
    enabled: true,
    autoShowInChat: true,
    defaultExpandPanel: false,
    debugMode: false,
    locale: 'zh',
    panelExpanded: false,
    fab: null,
    panel: null,
    panelSize: null,
    customApi: structuredClone(defaultCustomApi),
    presets: [],
    themes: [],
    activeThemeId: 'default',
};

/**
 * @param {FloatingMvuCustomApiSettings} customApi
 */
function ensureCustomApiShape(customApi) {
    for (const key of Object.keys(defaultCustomApi)) {
        if (customApi[key] === undefined) {
            customApi[key] = structuredClone(defaultCustomApi[key]);
        }
    }
    if (customApi.modelMode !== 'manual' && customApi.modelMode !== 'select') {
        customApi.modelMode = 'manual';
    }
    if (!Array.isArray(customApi.modelList)) {
        customApi.modelList = [];
    }
}

/**
 * @returns {FloatingMvuSettings}
 */
export function getSettings() {
    if (!extension_settings[SETTINGS_KEY]) {
        extension_settings[SETTINGS_KEY] = structuredClone(defaultSettings);
    }
    const settings = extension_settings[SETTINGS_KEY];
    for (const key of Object.keys(defaultSettings)) {
        if (key === 'customApi' || key === 'presets' || key === 'themes') {
            continue;
        }
        if (settings[key] === undefined) {
            settings[key] = structuredClone(defaultSettings[key]);
        }
    }
    if (!settings.customApi || typeof settings.customApi !== 'object') {
        settings.customApi = structuredClone(defaultCustomApi);
    }
    ensureCustomApiShape(settings.customApi);
    if (!Array.isArray(settings.presets)) {
        settings.presets = [];
    }
    if (settings.panelSize !== null && (typeof settings.panelSize !== 'object' || !settings.panelSize)) {
        settings.panelSize = null;
    }
    if (!Array.isArray(settings.themes)) {
        settings.themes = [];
    }
    if (typeof settings.activeThemeId !== 'string' || !settings.activeThemeId) {
        settings.activeThemeId = 'default';
    }
    if (settings.locale !== 'en' && settings.locale !== 'zh') {
        settings.locale = 'zh';
    }
    return settings;
}

export function saveSettings() {
    saveSettingsDebounced();
}

export function resetStoredPositions() {
    const settings = getSettings();
    settings.fab = null;
    settings.panel = null;
    settings.panelSize = null;
    saveSettings();
}

/** @typedef {(options?: { repositionDefaults?: boolean }) => void} SyncFloatingMvuUi */

/**
 * @param {SyncFloatingMvuUi} syncUi
 */
export async function registerExtensionSettingsUi(syncUi) {
    if (!document.getElementById(CONTAINER_ID)) {
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.className = 'extension_container';
        document.getElementById('extensions_settings2')?.appendChild(container);
    }

    const $container = $(`#${CONTAINER_ID}`);
    const needsRender = !$container.children().length
        || !$container.find('#floating_mvu_custom_api_enabled').length
        || !$container.find('#floating_mvu_custom_api_fields').length
        || !$container.find('#floating_mvu_debug_mode').length
        || !$container.find('#floating_mvu_locale').length;
    if (!needsRender) {
        bindSettingsControls(syncUi);
        refreshSettingsControls();
        return;
    }

    if ($container.children().length) {
        $container.empty();
    }

    const html = await renderExtensionTemplateAsync(getExtensionResourcePrefix(), 'settings');
    $container.append(html);
    bindSettingsControls(syncUi);
    refreshSettingsControls();
}

/**
 * @param {SyncFloatingMvuUi} syncUi
 */
function bindSettingsControls(syncUi) {
    const $root = $(`#${CONTAINER_ID}`);

    $root.find('#floating_mvu_enabled').off('input').on('input', function () {
        getSettings().enabled = $(this).prop('checked');
        saveSettings();
        syncUi();
    });

    $root.find('#floating_mvu_auto_show').off('input').on('input', function () {
        getSettings().autoShowInChat = $(this).prop('checked');
        saveSettings();
        syncUi();
    });

    $root.find('#floating_mvu_default_expand').off('input').on('input', function () {
        getSettings().defaultExpandPanel = $(this).prop('checked');
        saveSettings();
    });

    $root.find('#floating_mvu_debug_mode').off('input').on('input', function () {
        getSettings().debugMode = $(this).prop('checked');
        saveSettings();
    });

    $root.find('#floating_mvu_locale').off('input change').on('change', function () {
        const value = String($(this).val());
        getSettings().locale = value === 'en' ? 'en' : 'zh';
        saveSettings();
        applySettingsPanelI18n($root);
        syncUi();
    });

    $root.find('#floating_mvu_reset_positions').off('click').on('click', () => {
        resetStoredPositions();
        syncUi({ repositionDefaults: true });
    });

    $root.find('#floating_mvu_custom_api_enabled').off('input').on('input', function () {
        getSettings().customApi.enabled = $(this).prop('checked');
        saveSettings();
        updateCustomApiControlsDisabledState();
    });

    $root.find('#floating_mvu_custom_api_url').off('input').on('input', function () {
        getSettings().customApi.baseUrl = String($(this).val()).trim();
        saveSettings();
        updateCustomApiControlsDisabledState();
    });

    $root.find('#floating_mvu_custom_api_key').off('input').on('input', function () {
        getSettings().customApi.apiKey = String($(this).val());
        saveSettings();
    });

    $root.find('input[name="floating_mvu_custom_api_model_mode"]').off('input').on('input', function () {
        const value = String($(this).val());
        getSettings().customApi.modelMode = value === 'select' ? 'select' : 'manual';
        saveSettings();
        updateCustomApiModelModeVisibility();
        updateCustomApiControlsDisabledState();
    });

    $root.find('#floating_mvu_custom_api_model').off('input').on('input', function () {
        getSettings().customApi.model = String($(this).val()).trim();
        saveSettings();
    });

    $root.find('#floating_mvu_custom_api_model_select').off('input').on('input', function () {
        getSettings().customApi.model = String($(this).val());
        saveSettings();
    });

    $root.find('#floating_mvu_custom_api_fetch_models').off('click').on('click', async (event) => {
        event.preventDefault();
        const settings = getSettings();
        const customApi = settings.customApi;
        const $btn = $('#floating_mvu_custom_api_fetch_models');
        if (!customApi.enabled) {
            return;
        }
        $btn.prop('disabled', true);
        try {
            const models = await fetchModelList(customApi);
            customApi.modelList = models;
            if (!customApi.model && models.length) {
                customApi.model = models[0];
            }
            saveSettings();
            populateModelSelectOptions();
            $('#floating_mvu_custom_api_model').val(customApi.model);
            if (typeof toastr !== 'undefined') {
                toastr.success(t('settings.toast.modelsFetched', { count: models.length }), 'Floating MVU');
            }
        } catch (err) {
            console.error('[FloatingMVU] 拉取模型列表失败:', err);
            if (typeof toastr !== 'undefined') {
                toastr.error(err instanceof Error ? err.message : String(err), 'Floating MVU');
            }
        } finally {
            updateCustomApiControlsDisabledState();
        }
    });
}

function populateModelSelectOptions() {
    const settings = getSettings();
    const $select = $('#floating_mvu_custom_api_model_select');
    if (!$select.length) {
        return;
    }

    $select.empty();
    if (!settings.customApi.modelList.length) {
        $select.append(`<option value="">${t('settings.customApi.modelSelectEmpty')}</option>`);
    }

    for (const modelId of settings.customApi.modelList) {
        if (!modelId) {
            continue;
        }
        const selected = modelId === settings.customApi.model ? ' selected' : '';
        $select.append(`<option value="${modelId.replace(/"/g, '&quot;')}"${selected}>${modelId}</option>`);
    }

    if (settings.customApi.model && !settings.customApi.modelList.includes(settings.customApi.model)) {
        const escaped = settings.customApi.model.replace(/"/g, '&quot;');
        $select.append(`<option value="${escaped}" selected>${settings.customApi.model}</option>`);
    }
}

function updateCustomApiModelModeVisibility() {
    const settings = getSettings();
    const isSelect = settings.customApi.modelMode === 'select';
    $('#floating_mvu_custom_api_model_manual_block').toggleClass('displayNone', isSelect);
    $('#floating_mvu_custom_api_model_select_block').toggleClass('displayNone', !isSelect);
}

function updateCustomApiFieldsVisibility() {
    const sectionEnabled = getSettings().customApi.enabled;
    $('#floating_mvu_custom_api_fields').toggleClass('displayNone', !sectionEnabled);
}

function updateCustomApiControlsDisabledState() {
    updateCustomApiFieldsVisibility();

    const customApi = getSettings().customApi;
    const sectionEnabled = customApi.enabled;

    $('#floating_mvu_custom_api_url').prop('disabled', !sectionEnabled);
    $('#floating_mvu_custom_api_key').prop('disabled', !sectionEnabled);
    $('input[name="floating_mvu_custom_api_model_mode"]').prop('disabled', !sectionEnabled);

    const isManual = customApi.modelMode === 'manual';
    const isSelect = customApi.modelMode === 'select';
    const hasBaseUrl = Boolean(String(customApi.baseUrl ?? '').trim());

    $('#floating_mvu_custom_api_model').prop('disabled', !sectionEnabled || !isManual);
    $('#floating_mvu_custom_api_model_select').prop(
        'disabled',
        !sectionEnabled || !isSelect || !customApi.modelList.length,
    );
    $('#floating_mvu_custom_api_fetch_models').prop('disabled', !sectionEnabled || !hasBaseUrl);
}

function refreshSettingsControls() {
    const settings = getSettings();
    const customApi = settings.customApi;

    $('#floating_mvu_enabled').prop('checked', settings.enabled);
    $('#floating_mvu_auto_show').prop('checked', settings.autoShowInChat);
    $('#floating_mvu_default_expand').prop('checked', settings.defaultExpandPanel);
    $('#floating_mvu_debug_mode').prop('checked', settings.debugMode === true);

    $('#floating_mvu_custom_api_enabled').prop('checked', customApi.enabled);
    $('#floating_mvu_custom_api_url').val(customApi.baseUrl);
    $('#floating_mvu_custom_api_key').val(customApi.apiKey);
    $(`input[name="floating_mvu_custom_api_model_mode"][value="${customApi.modelMode}"]`).prop('checked', true);
    $('#floating_mvu_custom_api_model').val(customApi.model);

    populateModelSelectOptions();
    updateCustomApiModelModeVisibility();
    updateCustomApiControlsDisabledState();
    applySettingsPanelI18n($(`#${CONTAINER_ID}`));
}
