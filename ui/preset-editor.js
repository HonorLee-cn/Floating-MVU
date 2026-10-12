import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../popup.js';
import { t } from '../i18n/index.js';
import { createDraftPreset, deletePreset, upsertPreset } from '../mvu/preset-store.js';
import { ensurePresetShape } from '../mvu/schema.js';
import { renderConfigPanel } from './config-panel.js';

/**
 * @typedef {object} PresetEditorOptions
 * @property {() => void} [onSaved]
 * @property {() => void} [onDeleted]
 */

/**
 * @param {string | null} presetId
 * @param {PresetEditorOptions} [options]
 */
export async function openPresetEditor(presetId, options = {}) {
    const { getPresetById } = await import('../mvu/preset-store.js');
    const isNew = !presetId;
    /** @type {import('../mvu/schema.js').MvuPreset} */
    const preset = isNew
        ? createDraftPreset()
        : structuredClone(getPresetById(presetId) ?? createDraftPreset());

    ensurePresetShape(preset);

    const $dialog = $(`
        <div class="floating-mvu-preset-editor">
            <label>${t('presetEditor.name')}</label>
            <input type="text" class="text_pole wide100p floating-mvu-preset-name" />
            <label>${t('presetEditor.desc')}</label>
            <textarea class="text_pole wide100p floating-mvu-preset-desc" rows="2"></textarea>
            <div class="floating-mvu-preset-auto-update-box">
                <label class="checkbox_label floating-mvu-preset-auto-update-label">
                    <input type="checkbox" class="floating-mvu-preset-auto-update" />
                    <span>${t('presetEditor.autoUpdate')}</span>
                </label>
            </div>
            <hr class="wide100p marginTop10 marginBot10">
            <h4 class="margin0 marginBot5">${t('presetEditor.configPanel')}</h4>
            <div class="floating-mvu-config-panel-mount"></div>
        </div>
    `);

    $dialog.find('.floating-mvu-preset-name').val(preset.name);
    $dialog.find('.floating-mvu-preset-desc').val(preset.description);
    $dialog.find('.floating-mvu-preset-auto-update').prop('checked', preset.autoUpdateOnMessageReceived !== false);

    const $configMount = $dialog.find('.floating-mvu-config-panel-mount');
    renderConfigPanel($configMount, preset);

    /** @type {import('../../../../popup.js').CustomPopupButton[]} */
    const customButtons = [];
    if (!isNew) {
        customButtons.push({
            text: t('presetEditor.delete'),
            result: POPUP_RESULT.NEGATIVE,
            icon: 'fa-solid fa-trash-can',
            action: async () => {
                if (!confirm(t('presetEditor.confirmDelete'))) {
                    return;
                }
                deletePreset(preset.id);
                options.onDeleted?.();
            },
        });
    }

    const popup = new Popup($dialog[0], POPUP_TYPE.TEXT, '', {
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        okButton: t('presetEditor.save'),
        cancelButton: t('presetEditor.cancel'),
        customButtons,
    });

    const result = await popup.show();
    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        return;
    }

    preset.name = String($dialog.find('.floating-mvu-preset-name').val()).trim() || t('panel.unnamedPreset');
    preset.description = String($dialog.find('.floating-mvu-preset-desc').val()).trim();
    preset.autoUpdateOnMessageReceived = $dialog.find('.floating-mvu-preset-auto-update').prop('checked');
    ensurePresetShape(preset);
    upsertPreset(preset);
    options.onSaved?.();
}
