import { isChatPresetConfigured } from '../mvu/chat-preset.js';
import { PANEL_ID } from '../settings.js';
import { ensurePanelVarsButton } from './title-chrome.js';

/** 已绑定预设时在标题栏显示刷新 / 变量编辑按钮 */
export function syncPanelHeaderRefreshButton() {
    ensurePanelVarsButton();
    const show = isChatPresetConfigured();
    const $refresh = $(`#${PANEL_ID} .floating-mvu-refresh-btn`);
    if ($refresh.length) {
        $refresh.toggleClass('floating-mvu-header-btn-hidden', !show);
    }
    const $vars = $(`#${PANEL_ID} .floating-mvu-title-vars-btn`);
    if ($vars.length) {
        $vars.toggleClass('floating-mvu-header-btn-hidden', !show);
    }
}
