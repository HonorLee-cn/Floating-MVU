import { t } from '../i18n/index.js';
import { PANEL_CONTENT_ID, PANEL_ID } from '../settings.js';
import { syncPanelHeaderRefreshButton } from './panel-header-chrome.js';
import { renderMainView, updatePanelTitle } from './main-view.js';
import { setPanelTitleName } from './title-chrome.js';
import { renderPresetPicker } from './preset-picker.js';

/** @type {'main' | 'picker'} */
let currentView = 'main';

/**
 * @returns {JQuery<HTMLElement>}
 */
function getPanelContent() {
    return $(`#${PANEL_CONTENT_ID}`);
}

/**
 * @returns {JQuery<HTMLElement>}
 */
function getPanelTitle() {
    return $(`#${PANEL_ID} .floating-mvu-title`);
}

export function showMainView() {
    currentView = 'main';
    const $content = getPanelContent();
    if (!$content.length) {
        return;
    }
    renderMainView($content, { onOpenPicker: showPresetPicker });
    updatePanelTitle(getPanelTitle());
    syncPanelHeaderRefreshButton();
}

export function showPresetPicker() {
    currentView = 'picker';
    const $content = getPanelContent();
    if (!$content.length) {
        return;
    }
    renderPresetPicker($content);
    setPanelTitleName(t('panel.titlePickPreset'), getPanelTitle());
    syncPanelHeaderRefreshButton();
}

export function refreshPanelView() {
    if (currentView === 'picker') {
        showPresetPicker();
    } else {
        showMainView();
    }
}

export function resetPanelViewToMain() {
    currentView = 'main';
}
