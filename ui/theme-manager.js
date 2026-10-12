import { Popup, POPUP_TYPE } from '../../../../popup.js';
import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { applyActiveTheme } from '../theme/apply-theme.js';
import { DEFAULT_THEME_ID } from '../theme/tokens.js';
import {
    deleteCustomTheme,
    duplicateTheme,
    getActiveThemeId,
    listThemeSummaries,
    setActiveThemeId,
} from '../theme/theme-store.js';
import { openThemeEditor } from './theme-editor.js';

export async function openThemeManager() {
    await renderThemeManagerPopup();
}

async function renderThemeManagerPopup() {
    const builtinLabel = escapeHtml(t('theme.builtin'));
    const $dialog = $(`
        <div class="floating-mvu-theme-manager">
            <div class="flex-container flexGap5 marginBot8">
                <button type="button" class="menu_button floating-mvu-theme-add">
                    <i class="fa-solid fa-plus"></i>
                    <span>${escapeHtml(t('theme.new'))}</span>
                </button>
            </div>
            <div class="floating-mvu-theme-manager-list"></div>
            <p class="notes marginTop8">${escapeHtml(t('theme.hint'))}</p>
        </div>
    `);

    const $list = $dialog.find('.floating-mvu-theme-manager-list');

    const paintList = () => {
        $list.empty();
        for (const theme of listThemeSummaries()) {
            const isActive = theme.id === getActiveThemeId();
            const $row = $(`
                <div class="floating-mvu-theme-manager-row ${isActive ? 'floating-mvu-theme-manager-row-active' : ''}" data-theme-id="${escapeHtml(theme.id)}">
                    <button type="button" class="menu_button floating-mvu-theme-select">${escapeHtml(theme.name)}${theme.isBuiltin ? ` <span class="notes">${builtinLabel}</span>` : ''}</button>
                    <div class="floating-mvu-theme-manager-row-actions">
                        ${theme.isBuiltin ? '' : `<button type="button" class="menu_button fa-solid fa-pen floating-mvu-theme-edit" title="${escapeHtml(t('theme.edit'))}"></button>`}
                        <button type="button" class="menu_button fa-solid fa-copy floating-mvu-theme-copy" title="${escapeHtml(t('theme.copy'))}"></button>
                        ${theme.isBuiltin ? '' : `<button type="button" class="menu_button fa-solid fa-trash-can floating-mvu-theme-delete" title="${escapeHtml(t('theme.delete'))}"></button>`}
                    </div>
                </div>
            `);

            $row.find('.floating-mvu-theme-select').on('click', async () => {
                await setActiveThemeId(theme.id);
                applyActiveTheme();
                paintList();
            });

            $row.find('.floating-mvu-theme-edit').on('click', async (event) => {
                event.stopPropagation();
                await openThemeEditor(theme.id);
                paintList();
            });

            $row.find('.floating-mvu-theme-copy').on('click', async (event) => {
                event.stopPropagation();
                const copy = duplicateTheme(theme.id);
                await setActiveThemeId(copy.id);
                applyActiveTheme();
                paintList();
            });

            $row.find('.floating-mvu-theme-delete').on('click', async (event) => {
                event.stopPropagation();
                if (!confirm(t('theme.confirmDelete', { name: theme.name }))) {
                    return;
                }
                deleteCustomTheme(theme.id);
                applyActiveTheme();
                paintList();
            });

            $list.append($row);
        }
    };

    paintList();

    $dialog.find('.floating-mvu-theme-add').on('click', async () => {
        const copy = duplicateTheme(DEFAULT_THEME_ID);
        await setActiveThemeId(copy.id);
        applyActiveTheme();
        await openThemeEditor(copy.id);
        paintList();
    });

    const popup = new Popup($dialog[0], POPUP_TYPE.TEXT, t('theme.managerTitle'), {
        wider: true,
        allowVerticalScrolling: true,
        okButton: false,
        cancelButton: t('theme.close'),
    });

    await popup.show();
}
