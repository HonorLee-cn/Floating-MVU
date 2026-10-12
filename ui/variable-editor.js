import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import {
    DEFAULT_IMAGE_HEIGHT_PX,
    findVariableInPreset,
    getVariableImageHeightPx,
    getVariableRangeBounds,
    normalizeVariableType,
    removeVariableFromPreset,
} from '../mvu/schema.js';

/**
 * @typedef {object} VariableEditorOptions
 * @property {() => void} [onSaved]
 * @property {() => void} [onDeleted]
 * @property {() => void} [onClose]
 */

/**
 * @typedef {object} VariableBlockRenderOptions
 * @property {string} [textValue]
 * @property {number} [rangeValue]
 * @property {boolean} [editable]
 */

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @param {number} value
 * @returns {number}
 */
function clampRangeValueForVariable(variable, value) {
    const { min, max } = getVariableRangeBounds(variable);
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @returns {number}
 */
function getDefaultRangeDisplayValue(variable) {
    const { min, max } = getVariableRangeBounds(variable);
    return clampRangeValueForVariable(variable, Math.round((min + max) / 2));
}

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @param {VariableBlockRenderOptions} [options]
 * @returns {string}
 */
export function renderVariableBlockHtml(variable, options = {}) {
    const editable = options.editable !== false;
    const clickEdit = escapeHtml(t('var.clickEdit'));
    const titleAttr = editable ? ` title="${clickEdit}"` : '';
    const name = escapeHtml(variable.name || t('var.unnamed'));
    const idAttr = escapeHtml(variable.id);

    if (variable.varType === 'range') {
        const displayValue = clampRangeValueForVariable(
            variable,
            options.rangeValue ?? getDefaultRangeDisplayValue(variable),
        );
        const { min, max } = getVariableRangeBounds(variable);
        const span = max > min ? max - min : 1;
        const pct = Math.min(100, Math.max(0, ((displayValue - min) / span) * 100));
        return `
            <div class="floating-mvu-var-block floating-mvu-var-block--range" data-variable-id="${idAttr}"${titleAttr}>
                <div class="floating-mvu-var-range-fill" style="width: ${pct}%"></div>
                <div class="floating-mvu-var-block-row">
                    <span class="floating-mvu-var-block-name">${name}</span>
                    <span class="floating-mvu-var-block-range-value">${displayValue}</span>
                </div>
            </div>
        `;
    }

    const raw = options.textValue?.trim();
    const valueInner = raw
        ? escapeHtml(raw)
        : `<span class="floating-mvu-var-empty">${escapeHtml(t('main.varEmpty'))}</span>`;

    if (variable.varType === 'longtext') {
        return `
            <div class="floating-mvu-var-block floating-mvu-var-block--longtext" data-variable-id="${idAttr}"${titleAttr}>
                <div class="floating-mvu-var-block-row">
                    <span class="floating-mvu-var-block-name">${name}</span>
                    <span class="floating-mvu-var-block-value">${valueInner}</span>
                </div>
            </div>
        `;
    }

    if (variable.varType === 'image') {
        const heightPx = getVariableImageHeightPx(variable);
        const url = String(variable.imageUrl ?? '').trim();
        const urlAttr = url ? escapeHtml(url) : '';
        const mediaHtml = url
            ? `<img class="floating-mvu-var-image" src="${urlAttr}" alt="" loading="lazy" draggable="false" />`
            : `<span class="floating-mvu-var-empty floating-mvu-var-image-empty">${escapeHtml(t('main.varNoImage'))}</span>`;
        return `
            <div class="floating-mvu-var-block floating-mvu-var-block--image" data-variable-id="${idAttr}"${titleAttr}>
                <div class="floating-mvu-var-image-wrap" style="height: ${heightPx}px">
                    ${mediaHtml}
                </div>
            </div>
        `;
    }

    return `
        <div class="floating-mvu-var-block floating-mvu-var-block--text" data-variable-id="${idAttr}"${titleAttr}>
            <div class="floating-mvu-var-block-row">
                <span class="floating-mvu-var-block-name">${name}</span>
                <span class="floating-mvu-var-block-value">${valueInner}</span>
            </div>
        </div>
    `;
}

/**
 * @param {string} raw
 * @returns {number | null}
 */
function parseOptionalPositiveInt(raw) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return null;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
        return null;
    }
    return Math.floor(n);
}

/**
 * @param {string} raw
 * @param {number} fallback
 * @returns {number}
 */
function parseRangeBound(raw, fallback) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return fallback;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {JQuery<HTMLElement>} $host
 * @param {import('../mvu/schema.js').MvuPreset} preset
 * @param {string} variableId
 * @param {VariableEditorOptions} [options]
 */
export function openVariableEditor($host, preset, variableId, options = {}) {
    const variable = findVariableInPreset(preset, variableId);
    if (!variable) {
        return;
    }

    $host.find('.floating-mvu-var-editor-overlay').remove();

    const overlay = $(`
        <div class="floating-mvu-var-editor-overlay">
            <div class="floating-mvu-var-editor-card">
                <h4 class="floating-mvu-var-editor-title">${escapeHtml(t('presetEditor.editVar'))}</h4>
                <div class="floating-mvu-var-field-name">
                    <label>${escapeHtml(t('var.name'))}</label>
                    <input type="text" class="text_pole wide100p floating-mvu-var-name" />
                </div>
                <label>${escapeHtml(t('var.type'))}</label>
                <select class="text_pole wide100p floating-mvu-var-type">
                    <option value="text">${escapeHtml(t('var.type.text'))}</option>
                    <option value="longtext">${escapeHtml(t('var.type.longtext'))}</option>
                    <option value="range">${escapeHtml(t('var.type.range'))}</option>
                    <option value="image">${escapeHtml(t('var.type.image'))}</option>
                </select>
                <div class="floating-mvu-var-type-panel floating-mvu-var-type-panel-longtext">
                    <label>${escapeHtml(t('var.textMaxLen'))}</label>
                    <input type="number" min="1" step="1" class="text_pole wide100p floating-mvu-var-text-max-length" placeholder="${escapeHtml(t('var.textMaxLenPh'))}" />
                </div>
                <div class="floating-mvu-var-type-panel floating-mvu-var-type-panel-range">
                    <label>${escapeHtml(t('var.range'))}</label>
                    <div class="flex-container flexGap5">
                        <input type="number" step="any" class="text_pole floating-mvu-var-range-min" placeholder="${escapeHtml(t('var.rangeMin'))}" aria-label="${escapeHtml(t('var.rangeMin'))}" />
                        <input type="number" step="any" class="text_pole floating-mvu-var-range-max" placeholder="${escapeHtml(t('var.rangeMax'))}" aria-label="${escapeHtml(t('var.rangeMax'))}" />
                    </div>
                </div>
                <div class="floating-mvu-var-type-panel floating-mvu-var-type-panel-image">
                    <label>${escapeHtml(t('var.imageUrl'))}</label>
                    <input type="url" class="text_pole wide100p floating-mvu-var-image-url" placeholder="https://example.com/image.jpg" />
                    <label>${escapeHtml(t('var.imageHeight'))}</label>
                    <input type="number" min="24" max="2000" step="1" class="text_pole wide100p floating-mvu-var-image-height" placeholder="${DEFAULT_IMAGE_HEIGHT_PX}" />
                </div>
                <div class="floating-mvu-var-field-desc">
                    <label>${escapeHtml(t('var.description'))}</label>
                    <textarea class="text_pole wide100p floating-mvu-var-desc" rows="3"></textarea>
                </div>
                <div class="flex-container flexGap5 marginTop5">
                    <button type="button" class="menu_button floating-mvu-var-save">${escapeHtml(t('var.save'))}</button>
                    <button type="button" class="menu_button floating-mvu-var-delete">${escapeHtml(t('var.delete'))}</button>
                    <button type="button" class="menu_button floating-mvu-var-cancel">${escapeHtml(t('var.cancel'))}</button>
                </div>
            </div>
        </div>
    `);

    const $typeSelect = overlay.find('.floating-mvu-var-type');
    const $panelLongtext = overlay.find('.floating-mvu-var-type-panel-longtext');
    const $panelRange = overlay.find('.floating-mvu-var-type-panel-range');
    const $panelImage = overlay.find('.floating-mvu-var-type-panel-image');

    const $fieldName = overlay.find('.floating-mvu-var-field-name');
    const $fieldDesc = overlay.find('.floating-mvu-var-field-desc');

    const syncTypePanels = () => {
        const type = normalizeVariableType(String($typeSelect.val()));
        const isImage = type === 'image';
        $panelLongtext.toggleClass('is-visible', type === 'longtext');
        $panelRange.toggleClass('is-visible', type === 'range');
        $panelImage.toggleClass('is-visible', isImage);
        $fieldName.toggleClass('is-hidden', isImage);
        $fieldDesc.toggleClass('is-hidden', isImage);
        overlay.find('.floating-mvu-var-editor-title').text(isImage ? t('presetEditor.editImage') : t('presetEditor.editVar'));
    };

    overlay.find('.floating-mvu-var-name').val(variable.name);
    $typeSelect.val(variable.varType);
    overlay.find('.floating-mvu-var-desc').val(variable.description);

    if (variable.textMaxLength != null && variable.textMaxLength > 0) {
        overlay.find('.floating-mvu-var-text-max-length').val(String(variable.textMaxLength));
    }

    const rangeBounds = getVariableRangeBounds(variable);
    overlay.find('.floating-mvu-var-range-min').val(String(rangeBounds.min));
    overlay.find('.floating-mvu-var-range-max').val(String(rangeBounds.max));

    overlay.find('.floating-mvu-var-image-url').val(variable.imageUrl ?? '');
    overlay.find('.floating-mvu-var-image-height').val(String(getVariableImageHeightPx(variable)));

    $typeSelect.on('change', syncTypePanels);
    syncTypePanels();

    overlay.find('.floating-mvu-var-save').on('click', () => {
        variable.varType = normalizeVariableType(String($typeSelect.val()));

        if (variable.varType === 'image') {
            variable.name = '';
            variable.description = '';
        } else {
            variable.name = String(overlay.find('.floating-mvu-var-name').val()).trim();
            variable.description = String(overlay.find('.floating-mvu-var-desc').val()).trim();
        }

        if (variable.varType === 'longtext') {
            const maxLen = parseOptionalPositiveInt(overlay.find('.floating-mvu-var-text-max-length').val());
            if (maxLen == null) {
                delete variable.textMaxLength;
            } else {
                variable.textMaxLength = maxLen;
            }
            delete variable.rangeMin;
            delete variable.rangeMax;
            delete variable.imageUrl;
            delete variable.imageHeightPx;
        } else if (variable.varType === 'range') {
            let min = parseRangeBound(overlay.find('.floating-mvu-var-range-min').val(), 0);
            let max = parseRangeBound(overlay.find('.floating-mvu-var-range-max').val(), 100);
            if (min >= max) {
                max = min + 1;
            }
            variable.rangeMin = min;
            variable.rangeMax = max;
            delete variable.textMaxLength;
            delete variable.imageUrl;
            delete variable.imageHeightPx;
        } else if (variable.varType === 'image') {
            variable.imageUrl = String(overlay.find('.floating-mvu-var-image-url').val()).trim();
            const heightRaw = parseOptionalPositiveInt(overlay.find('.floating-mvu-var-image-height').val());
            variable.imageHeightPx = heightRaw ?? DEFAULT_IMAGE_HEIGHT_PX;
            delete variable.textMaxLength;
            delete variable.rangeMin;
            delete variable.rangeMax;
        } else {
            delete variable.textMaxLength;
            delete variable.rangeMin;
            delete variable.rangeMax;
            delete variable.imageUrl;
            delete variable.imageHeightPx;
        }

        overlay.remove();
        options.onSaved?.();
        options.onClose?.();
    });

    overlay.find('.floating-mvu-var-delete').on('click', () => {
        removeVariableFromPreset(preset, variableId);
        overlay.remove();
        options.onDeleted?.();
        options.onClose?.();
    });

    overlay.find('.floating-mvu-var-cancel').on('click', () => {
        overlay.remove();
        options.onClose?.();
    });

    $host.append(overlay);
    $host.closest('.floating-mvu-preset-editor, .floating-mvu-panel').addClass('floating-mvu-overlay-open');
    overlay.on('remove', () => {
        if (!$host.find('.floating-mvu-var-editor-overlay, .floating-mvu-group-editor-overlay').length) {
            $host.closest('.floating-mvu-preset-editor, .floating-mvu-panel').removeClass('floating-mvu-overlay-open');
        }
    });

    overlay.find('.floating-mvu-var-name').trigger('focus');
}
