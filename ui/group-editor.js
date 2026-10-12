import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { findGroupInPreset, isRootGroup, removeGroupFromPreset } from '../mvu/schema.js';

/**
 * @typedef {object} GroupEditorOptions
 * @property {() => void} [onSaved]
 * @property {() => void} [onDeleted]
 * @property {() => void} [onClose]
 */

/**
 * @param {JQuery<HTMLElement>} $host
 * @param {import('../mvu/schema.js').MvuPreset} preset
 * @param {string} groupId
 * @param {GroupEditorOptions} [options]
 */
export function openGroupEditor($host, preset, groupId, options = {}) {
    const group = findGroupInPreset(preset, groupId);
    if (!group || isRootGroup(group)) {
        return;
    }

    $host.find('.floating-mvu-group-editor-overlay').remove();

    const overlay = $(`
        <div class="floating-mvu-group-editor-overlay">
            <div class="floating-mvu-var-editor-card floating-mvu-group-editor-card">
                <h4 class="floating-mvu-var-editor-title">${escapeHtml(t('group.editTitle'))}</h4>
                <label>${escapeHtml(t('group.name'))}</label>
                <input type="text" class="text_pole wide100p floating-mvu-group-name" placeholder="${escapeHtml(t('group.namePh'))}" />
                <div class="flex-container flexGap5 marginTop5">
                    <button type="button" class="menu_button floating-mvu-group-save">${escapeHtml(t('var.save'))}</button>
                    <button type="button" class="menu_button floating-mvu-group-delete">${escapeHtml(t('group.deleteBtn'))}</button>
                    <button type="button" class="menu_button floating-mvu-group-cancel">${escapeHtml(t('var.cancel'))}</button>
                </div>
            </div>
        </div>
    `);

    overlay.find('.floating-mvu-group-name').val(group.name ?? '');

    overlay.find('.floating-mvu-group-save').on('click', () => {
        group.name = String(overlay.find('.floating-mvu-group-name').val()).trim();
        overlay.remove();
        options.onSaved?.();
        options.onClose?.();
    });

    overlay.find('.floating-mvu-group-delete').on('click', () => {
        if (!confirm(t('group.confirmDelete'))) {
            return;
        }
        removeGroupFromPreset(preset, groupId);
        overlay.remove();
        options.onDeleted?.();
        options.onClose?.();
    });

    overlay.find('.floating-mvu-group-cancel').on('click', () => {
        overlay.remove();
        options.onClose?.();
    });

    $host.append(overlay);
    $host.closest('.floating-mvu-preset-editor, .floating-mvu-panel').addClass('floating-mvu-overlay-open');
    overlay.on('remove', () => {
        if (!$host.find('.floating-mvu-group-editor-overlay, .floating-mvu-var-editor-overlay').length) {
            $host.closest('.floating-mvu-preset-editor, .floating-mvu-panel').removeClass('floating-mvu-overlay-open');
        }
    });

    overlay.find('.floating-mvu-group-name').trigger('focus');
}

/**
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @returns {boolean}
 */
export function groupHasVisibleTitle(group) {
    return Boolean(String(group.name ?? '').trim());
}

/**
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @returns {string}
 */
export function renderGroupHeaderLabel(group) {
    const name = String(group.name ?? '').trim();
    return name ? escapeHtml(name) : '';
}
