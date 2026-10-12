import { t } from '../i18n/index.js';
import { FAB_ID, PANEL_ID } from '../settings.js';

/**
 * @param {boolean} active
 */
export function setMvuUpdateIndicator(active) {
    const $panel = $(`#${PANEL_ID}`);
    const $titleStatus = $panel.find('.floating-mvu-title-status');
    if ($titleStatus.length) {
        $titleStatus.text(active ? t('panel.updating') : '');
        $titleStatus.toggleClass('floating-mvu-title-status-visible', active);
    }

    const $fab = $(`#${FAB_ID}`);
    $fab.toggleClass('floating-mvu-fab-updating', active);
    $fab.find('.floating-mvu-fab-update-badge').attr('aria-hidden', active ? 'false' : 'true');
}
