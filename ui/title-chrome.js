import { FAB_ID, PANEL_ID } from '../settings.js';

/**
 * 将旧版单行标题升级为「名称 + 状态」结构。
 */
export function ensurePanelTitleChrome() {
    const $title = $(`#${PANEL_ID} .floating-mvu-title`).first();
    if (!$title.length) {
        return;
    }
    if ($title.find('.floating-mvu-title-name').length) {
        return;
    }
    const label = $title.text().trim() || 'Floating MVU';
    $title.empty().append(`
        <span class="floating-mvu-title-name"></span>
        <span class="floating-mvu-title-status" aria-live="polite"></span>
    `);
    $title.find('.floating-mvu-title-name').text(label);
}

/**
 * @param {JQuery<HTMLElement>} [$title]
 * @returns {JQuery<HTMLElement>}
 */
export function getPanelTitleNameElement($title) {
    ensurePanelTitleChrome();
    const $el = $title ?? $(`#${PANEL_ID} .floating-mvu-title`).first();
    const $name = $el.find('.floating-mvu-title-name');
    return $name.length ? $name : $el;
}

/**
 * @param {string} text
 * @param {JQuery<HTMLElement>} [$title]
 */
export function setPanelTitleName(text, $title) {
    getPanelTitleNameElement($title).text(text);
}

/**
 * FAB 上叠加更新状态图标。
 */
export function ensureFabUpdateBadge() {
    const $fab = $(`#${FAB_ID}`);
    if (!$fab.length || $fab.find('.floating-mvu-fab-update-badge').length) {
        return;
    }
    $fab.append(`
        <span class="floating-mvu-fab-update-badge" aria-hidden="true">
            <i class="fa-solid fa-arrows-rotate"></i>
        </span>
    `);
}
