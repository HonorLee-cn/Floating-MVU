import { isChatPresetConfigured } from '../mvu/chat-preset.js';
import { PANEL_ID } from '../settings.js';

/** 已绑定预设时在标题栏显示刷新按钮（测试：输出 MVU 对话 Prompt） */
export function syncPanelHeaderRefreshButton() {
    const $btn = $(`#${PANEL_ID} .floating-mvu-refresh-btn`);
    if (!$btn.length) {
        return;
    }
    const show = isChatPresetConfigured();
    $btn.toggleClass('floating-mvu-header-btn-hidden', !show);
}
