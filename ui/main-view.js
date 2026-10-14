import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { getBoundPresetForChat, isChatPresetConfigured } from '../mvu/chat-preset.js';
import { getChatVariableValues } from '../mvu/chat-variables.js';
import { getPresetVariables } from '../mvu/schema.js';
import { appendReadonlyGroupTree } from './config-panel.js';
import { setPanelTitleName } from './title-chrome.js';
/**
 * @typedef {object} MainViewOptions
 * @property {() => void} [onOpenPicker]
 */

/**
 * @param {JQuery<HTMLElement>} $container
 * @param {MainViewOptions} [options]
 */
export function renderMainView($container, options = {}) {
    $container.empty();

    const preset = getBoundPresetForChat();
    const configured = isChatPresetConfigured() && preset;

    if (!configured) {
        const $empty = $(`
            <div class="floating-mvu-main-empty">
                <p class="floating-mvu-placeholder">${escapeHtml(t('main.noPreset'))}</p>
                <button type="button" class="menu_button floating-mvu-quick-pick-preset">
                    <i class="fa-solid fa-list"></i>
                    <span>${escapeHtml(t('main.pickPreset'))}</span>
                </button>
            </div>
        `);
        $empty.find('.floating-mvu-quick-pick-preset').on('click', () => options.onOpenPicker?.());
        $container.append($empty);
        return;
    }

    const variables = getPresetVariables(preset);
    const $main = $(`
        <div class="floating-mvu-main-configured">
            <div class="floating-mvu-main-tree"></div>
        </div>
    `);

    const $tree = $main.find('.floating-mvu-main-tree');
    if (!variables.length && !preset.root.children.some(c => c.type === 'group')) {
        $tree.append(`<p class="floating-mvu-placeholder">${escapeHtml(t('main.noVariables'))}</p>`);
    } else {
        appendReadonlyGroupTree($tree, preset.root, true, getChatVariableValues());
    }

    $container.append($main);
}

/**
 * @param {JQuery<HTMLElement>} $title
 */
export function updatePanelTitle($title) {
    const preset = getBoundPresetForChat();
    if (preset) {
        const name = String(preset.name ?? '').trim();
        setPanelTitleName(name || t('panel.unnamedPreset'), $title);
    } else {
        setPanelTitleName(t('panel.titleDefault'), $title);
    }
}
