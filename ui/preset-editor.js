import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../popup.js';
import { t } from '../i18n/index.js';
import { createDraftPreset, deletePreset, upsertPreset } from '../mvu/preset-store.js';
import { getChatPresetId } from '../mvu/chat-preset.js';
import { ensurePresetShape, isPresetWorldInfoSyncEnabled, MVU_CANDIDATE_TYPES } from '../mvu/schema.js';
import {
    removeMvuWorldInfoEntry,
    syncMvuWorldInfoFromChatImmediate,
} from '../mvu/world-info-sync.js';
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
    const initialSyncWorldInfo = isPresetWorldInfoSyncEnabled(preset);

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
            <div class="floating-mvu-preset-auto-update-box">
                <label class="checkbox_label floating-mvu-preset-auto-update-label">
                    <input type="checkbox" class="floating-mvu-preset-sync-world-info" />
                    <span>${t('presetEditor.syncWorldInfo')}</span>
                </label>
            </div>
            <div class="floating-mvu-preset-auto-update-box">
                <label class="checkbox_label floating-mvu-preset-auto-update-label">
                    <input type="checkbox" class="floating-mvu-preset-candidates" />
                    <span>${t('presetEditor.candidateReplies')}</span>
                </label>
                <div class="floating-mvu-preset-candidate-options">
                    <div class="floating-mvu-preset-candidate-types-row">
                        <span class="floating-mvu-preset-candidate-types-label">${t('presetEditor.candidateTypes')}</span>
                        <div class="floating-mvu-preset-candidate-types-flex" role="group" aria-label="${t('presetEditor.candidateTypes')}">
                            ${MVU_CANDIDATE_TYPES.map(type => `
                                <label class="floating-mvu-preset-candidate-type-toggle">
                                    <input type="checkbox" class="floating-mvu-preset-candidate-type" data-candidate-type="${type}" />
                                    <span class="floating-mvu-preset-candidate-type-toggle-face">${t(`candidate.type.${type}`)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="floating-mvu-preset-candidate-count-row">
                        <label class="floating-mvu-preset-candidate-count-label">${t('presetEditor.candidateCount')}</label>
                        <input type="range" class="floating-mvu-preset-candidate-count" min="1" max="5" step="1" />
                        <span class="floating-mvu-preset-candidate-count-value"></span>
                    </div>
                </div>
            </div>
            <hr class="wide100p marginTop10 marginBot10">
            <h4 class="margin0 marginBot5">${t('presetEditor.configPanel')}</h4>
            <div class="floating-mvu-config-panel-mount"></div>
        </div>
    `);

    $dialog.find('.floating-mvu-preset-name').val(preset.name);
    $dialog.find('.floating-mvu-preset-desc').val(preset.description);
    $dialog.find('.floating-mvu-preset-auto-update').prop('checked', preset.autoUpdateOnMessageReceived !== false);
    $dialog.find('.floating-mvu-preset-sync-world-info').prop('checked', initialSyncWorldInfo);
    const $candidateToggle = $dialog.find('.floating-mvu-preset-candidates');
    const $candidateOptions = $dialog.find('.floating-mvu-preset-candidate-options');
    const $candidateRange = $dialog.find('.floating-mvu-preset-candidate-count');
    const $candidateValue = $dialog.find('.floating-mvu-preset-candidate-count-value');
    $candidateToggle.prop('checked', preset.autoCandidateReplies === true);
    for (const type of MVU_CANDIDATE_TYPES) {
        $dialog.find(`.floating-mvu-preset-candidate-type[data-candidate-type="${type}"]`)
            .prop('checked', preset.candidateTypes?.[type] === true);
    }
    $candidateRange.val(String(preset.maxCandidateCount ?? 3));
    $candidateValue.text(String($candidateRange.val()));
    $candidateRange.on('input', () => {
        $candidateValue.text(String($candidateRange.val()));
    });
    const syncCandidateOptionsVisibility = () => {
        const on = $candidateToggle.prop('checked');
        $candidateOptions.toggleClass('floating-mvu-preset-candidate-options-hidden', !on);
    };
    syncCandidateOptionsVisibility();
    $candidateToggle.on('change', syncCandidateOptionsVisibility);

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
    preset.autoCandidateReplies = $dialog.find('.floating-mvu-preset-candidates').prop('checked');
    preset.maxCandidateCount = Number($dialog.find('.floating-mvu-preset-candidate-count').val());
    /** @type {import('../mvu/schema.js').MvuPreset['candidateTypes']} */
    const candidateTypes = {};
    for (const type of MVU_CANDIDATE_TYPES) {
        candidateTypes[type] = $dialog
            .find(`.floating-mvu-preset-candidate-type[data-candidate-type="${type}"]`)
            .prop('checked');
    }
    preset.candidateTypes = candidateTypes;
    preset.syncVariablesToWorldInfo = $dialog.find('.floating-mvu-preset-sync-world-info').prop('checked');
    ensurePresetShape(preset);
    upsertPreset(preset);

    if (getChatPresetId() === preset.id) {
        const syncNow = isPresetWorldInfoSyncEnabled(preset);
        if (initialSyncWorldInfo && !syncNow) {
            await removeMvuWorldInfoEntry();
        } else if (syncNow) {
            await syncMvuWorldInfoFromChatImmediate(preset);
        }
    }

    options.onSaved?.();
}
