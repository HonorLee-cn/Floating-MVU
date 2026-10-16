import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../popup.js';
import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { getBoundPresetForChat } from '../mvu/chat-preset.js';
import { getChatVariableValues, mergeChatVariableValues } from '../mvu/chat-variables.js';
import { getPresetVariables, getVariableRangeBounds, isPresetWorldInfoSyncEnabled } from '../mvu/schema.js';
import { syncMvuWorldInfoFromChatImmediate } from '../mvu/world-info-sync.js';
import { refreshPanelView } from './panel-views.js';

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @param {string | number | undefined} raw
 * @returns {string}
 */
function formatValueForEditorInput(variable, raw) {
    if (raw === undefined || raw === null) {
        return '';
    }
    if (variable.varType === 'range') {
        return String(raw);
    }
    return String(raw);
}

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @returns {string}
 */
function renderValueFieldHtml(variable) {
    const name = String(variable.name ?? '').trim();
    const nameAttr = escapeHtml(name);
    const current = getChatVariableValues();
    const value = formatValueForEditorInput(variable, current[name]);
    const desc = String(variable.description ?? '').trim();
    const descHtml = desc ? `<span class="floating-mvu-values-editor-desc">${escapeHtml(desc)}</span>` : '';

    if (variable.varType === 'longtext') {
        return `
            <div class="floating-mvu-values-editor-row" data-variable-name="${nameAttr}">
                <label class="floating-mvu-values-editor-label">${nameAttr}${descHtml}</label>
                <textarea class="text_pole wide100p floating-mvu-values-editor-input" rows="3" data-var-type="longtext">${escapeHtml(value)}</textarea>
            </div>
        `;
    }

    if (variable.varType === 'range') {
        const { min, max } = getVariableRangeBounds(variable);
        return `
            <div class="floating-mvu-values-editor-row" data-variable-name="${nameAttr}">
                <label class="floating-mvu-values-editor-label">${nameAttr} <span class="floating-mvu-values-editor-range-hint">(${min}~${max})</span>${descHtml}</label>
                <input type="number" step="any" class="text_pole wide100p floating-mvu-values-editor-input" data-var-type="range" min="${min}" max="${max}" value="${escapeHtml(value)}" />
            </div>
        `;
    }

    return `
        <div class="floating-mvu-values-editor-row" data-variable-name="${nameAttr}">
            <label class="floating-mvu-values-editor-label">${nameAttr}${descHtml}</label>
            <input type="text" class="text_pole wide100p floating-mvu-values-editor-input" data-var-type="text" value="${escapeHtml(value)}" />
        </div>
    `;
}

/**
 * @param {JQuery<HTMLElement>} $dialog
 * @returns {Record<string, string | number>}
 */
function collectPatchFromDialog($dialog) {
    /** @type {Record<string, string | number>} */
    const patch = {};
    $dialog.find('.floating-mvu-values-editor-row').each((_i, row) => {
        const name = String($(row).attr('data-variable-name') ?? '').trim();
        if (!name) {
            return;
        }
        const $input = $(row).find('.floating-mvu-values-editor-input');
        const varType = String($input.attr('data-var-type') ?? 'text');
        if (varType === 'range') {
            patch[name] = String($input.val()).trim();
        } else {
            patch[name] = String($input.val());
        }
    });
    return patch;
}

export async function openMvuValuesEditor() {
    const preset = getBoundPresetForChat();
    if (!preset) {
        if (typeof toastr !== 'undefined') {
            toastr.warning(t('err.noPresetBound'));
        }
        return;
    }

    const variables = getPresetVariables(preset).filter(v =>
        v.varType !== 'image'
        && String(v.name ?? '').trim(),
    );

    const rowsHtml = variables.length
        ? variables.map(v => renderValueFieldHtml(v)).join('')
        : `<p class="floating-mvu-placeholder">${escapeHtml(t('valuesEditor.empty'))}</p>`;

    const $dialog = $(`
        <div class="floating-mvu-values-editor">
            <p class="notes marginBot8">${escapeHtml(t('valuesEditor.hint'))}</p>
            <div class="floating-mvu-values-editor-list">${rowsHtml}</div>
        </div>
    `);

    const popup = new Popup($dialog[0], POPUP_TYPE.TEXT, t('valuesEditor.title'), {
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        okButton: variables.length ? t('valuesEditor.save') : t('var.cancel'),
        cancelButton: variables.length ? t('var.cancel') : undefined,
    });

    const result = await popup.show();
    if (result !== POPUP_RESULT.AFFIRMATIVE || !variables.length) {
        return;
    }

    const patch = collectPatchFromDialog($dialog);
    await mergeChatVariableValues(preset, patch);
    if (isPresetWorldInfoSyncEnabled(preset)) {
        await syncMvuWorldInfoFromChatImmediate(preset);
    }
    refreshPanelView();

    if (typeof toastr !== 'undefined') {
        toastr.success(t('valuesEditor.saved'));
    }
}
