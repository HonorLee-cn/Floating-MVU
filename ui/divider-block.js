import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';

/**
 * @returns {string}
 */
export function renderPanelDividerHtml() {
    return '<hr class="floating-mvu-panel-divider" aria-hidden="true" />';
}

/**
 * @param {string} dividerId
 * @returns {string}
 */
export function renderConfigDividerHtml(dividerId) {
    const idAttr = escapeHtml(dividerId);
    const deleteLabel = escapeHtml(t('config.deleteDivider'));
    return `
        <div class="floating-mvu-config-divider" data-divider-id="${idAttr}">
            <hr class="floating-mvu-config-divider-line" aria-hidden="true" />
            <button type="button" class="menu_button floating-mvu-config-divider-delete" title="${deleteLabel}" aria-label="${deleteLabel}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;
}
