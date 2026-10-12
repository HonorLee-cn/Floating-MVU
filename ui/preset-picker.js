import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { deletePreset, listPresets } from '../mvu/preset-store.js';
import { setChatPresetId } from '../mvu/chat-preset.js';
import { openPresetEditor } from './preset-editor.js';
import { showMainView } from './panel-views.js';

/**
 * @param {JQuery<HTMLElement>} $container
 */
export function renderPresetPicker($container) {
    $container.empty();

    const presets = listPresets();

    const $picker = $(`
        <div class="floating-mvu-preset-picker">
            <div class="flex-container flexGap5 marginBot5">
                <button type="button" class="menu_button floating-mvu-preset-add">
                    <i class="fa-solid fa-plus"></i>
                    <span>${escapeHtml(t('picker.addPreset'))}</span>
                </button>
                <button type="button" class="menu_button floating-mvu-preset-back">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>${escapeHtml(t('picker.back'))}</span>
                </button>
            </div>
            <div class="floating-mvu-preset-list"></div>
        </div>
    `);

    const $list = $picker.find('.floating-mvu-preset-list');

    if (!presets.length) {
        $list.append(`<p class="floating-mvu-placeholder">${escapeHtml(t('picker.empty'))}</p>`);
    } else {
        for (const preset of presets) {
            const displayName = preset.name || t('panel.unnamedPreset');
            const $row = $(`
                <div class="floating-mvu-preset-row" data-preset-id="${escapeHtml(preset.id)}">
                    <button type="button" class="floating-mvu-preset-row-name menu_button">${escapeHtml(displayName)}</button>
                    <div class="floating-mvu-preset-row-actions">
                        <button type="button" class="menu_button fa-solid fa-pen floating-mvu-preset-edit" title="${escapeHtml(t('picker.edit'))}"></button>
                        <button type="button" class="menu_button fa-solid fa-trash-can floating-mvu-preset-delete" title="${escapeHtml(t('picker.delete'))}"></button>
                    </div>
                </div>
            `);

            $row.find('.floating-mvu-preset-row-name').on('click', async () => {
                await setChatPresetId(preset.id);
                showMainView();
            });

            $row.find('.floating-mvu-preset-edit').on('click', async (event) => {
                event.stopPropagation();
                await openPresetEditor(preset.id, {
                    onSaved: () => renderPresetPicker($container),
                    onDeleted: () => renderPresetPicker($container),
                });
            });

            $row.find('.floating-mvu-preset-delete').on('click', async (event) => {
                event.stopPropagation();
                if (!confirm(t('picker.confirmDelete', { name: preset.name || t('panel.unnamedPreset') }))) {
                    return;
                }
                deletePreset(preset.id);
                renderPresetPicker($container);
            });

            $list.append($row);
        }
    }

    $picker.find('.floating-mvu-preset-add').on('click', async () => {
        await openPresetEditor(null, {
            onSaved: () => renderPresetPicker($container),
        });
    });

    $picker.find('.floating-mvu-preset-back').on('click', () => showMainView());

    $container.append($picker);
}
