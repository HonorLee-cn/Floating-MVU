import { applyPanelChromeI18n } from '../i18n/index.js';
import { getSettings, saveSettings, FAB_ID, PANEL_CONTENT_ID, PANEL_ID, ROOT_ID } from '../settings.js';
import { refreshPanelView, resetPanelViewToMain, showPresetPicker } from './panel-views.js';
import { openThemeManager } from './theme-manager.js';
import { applyActiveTheme } from '../theme/apply-theme.js';
import { runMvuPanelRefresh } from '../mvu/mvu-refresh.js';
import { getActiveChatId, getChatAvatarUrl, isActiveChatContext } from '../chat-context.js';
import { makeDraggable } from './drag.js';
import { makePanelResizable } from './resize.js';
import { bindCandidateListFabFollow, refreshCandidateList } from './candidate-list.js';
import { syncPanelHeaderRefreshButton } from './panel-header-chrome.js';
import { ensureFabUpdateBadge, ensurePanelTitleChrome } from './title-chrome.js';
import {
    clampAllFloatingMvuElements,
    clampElementToViewport,
    clampPanelDimensions,
    getViewportPanelMaxSize,
    syncPanelBodyScrollbarVisibility,
} from './viewport.js';

const DEFAULT_PANEL_WIDTH = 360;
const DEFAULT_PANEL_HEIGHT = 480;

/** @type {string | undefined} */
let lastChatId;

/**
 * @typedef {object} SyncOptions
 * @property {boolean} [repositionDefaults]
 */

/**
 * @typedef {object} FloatingMvuPosition
 * @property {number | string} [top]
 * @property {number | string} [left]
 */

function getDefaultFabPosition() {
    const size = 56;
    const margin = 24;
    return {
        top: Math.max(8, window.innerHeight - size - margin - 72),
        left: Math.max(8, window.innerWidth - size - margin),
    };
}

function getDefaultPanelPosition() {
    return { top: 120, left: 24 };
}

function getDefaultPanelSize() {
    const { maxWidth, maxHeight } = getViewportPanelMaxSize();
    return clampPanelDimensions(
        Math.min(DEFAULT_PANEL_WIDTH, maxWidth),
        Math.min(DEFAULT_PANEL_HEIGHT, maxHeight),
    );
}

/**
 * @param {JQuery<HTMLElement>} $panel
 * @param {{ width: number, height: number } | null} stored
 */
function applyPanelSize($panel, stored) {
    const fallback = getDefaultPanelSize();
    const rawWidth = stored?.width ?? fallback.width;
    const rawHeight = stored?.height ?? fallback.height;
    const { width, height } = clampPanelDimensions(rawWidth, rawHeight);
    $panel.css({
        width: `${width}px`,
        height: `${height}px`,
        maxHeight: `${height}px`,
        maxWidth: `${getViewportPanelMaxSize().maxWidth}px`,
    });
    syncPanelBodyScrollbarVisibility($panel);
}

function persistPanelSize($panel) {
    const element = $panel.get(0);
    if (!element) {
        return;
    }
    const settings = getSettings();
    settings.panelSize = {
        width: Math.round(element.offsetWidth),
        height: Math.round(element.offsetHeight),
    };
    saveSettings();
}

/**
 * @param {JQuery<HTMLElement>} $el
 * @param {FloatingMvuPosition | null} stored
 * @param {{ top: number, left: number }} fallback
 */
function applyElementPosition($el, stored, fallback) {
    const top = stored?.top ?? fallback.top;
    const left = stored?.left ?? fallback.left;
    $el.css({
        top: typeof top === 'number' ? `${top}px` : top,
        left: typeof left === 'number' ? `${left}px` : left,
        right: 'auto',
        bottom: 'auto',
        margin: 'unset',
    });
}

/**
 * @param {JQuery<HTMLElement>} $el
 * @param {'fab' | 'panel'} key
 */
function persistElementPosition($el, key) {
    const element = $el.get(0);
    if (!element) {
        return;
    }
    const rect = element.getBoundingClientRect();
    const settings = getSettings();
    settings[key] = {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
    };
    saveSettings();
}

function updateFabAvatar() {
    const url = getChatAvatarUrl();
    $(`#${FAB_ID} img`).attr('src', url);
}

function setPanelExpanded(expanded) {
    const settings = getSettings();
    settings.panelExpanded = expanded;
    $(`#${PANEL_ID}`).toggleClass('floating-mvu-panel-collapsed', !expanded);
    saveSettings();
    requestAnimationFrame(() => clampAllFloatingMvuElements());
}

function togglePanelExpanded() {
    setPanelExpanded(!getSettings().panelExpanded);
}

function collapsePanel() {
    setPanelExpanded(false);
}

function bindFabDrag($fab) {
    makeDraggable($fab, {
        onClick: () => togglePanelExpanded(),
        onDragEnd: () => {
            clampElementToViewport($fab);
            persistElementPosition($fab, 'fab');
            refreshCandidateList();
        },
    });
}

function bindPanelDrag($panel) {
    makeDraggable($panel, {
        handle: $panel.find('.floating-mvu-panel-drag-handle'),
        onDragEnd: () => {
            clampElementToViewport($panel);
            persistElementPosition($panel, 'panel');
        },
    });
}

function bindPanelResize($panel) {
    makePanelResizable($panel, () => {
        persistPanelSize($panel);
        clampElementToViewport($panel);
        syncPanelBodyScrollbarVisibility($panel);
    });
}

function ensurePanelResizeHandle($panel) {
    if ($panel.find('.floating-mvu-panel-resize-handle').length) {
        return;
    }
    $panel.append('<div class="floating-mvu-panel-resize-handle" title="拖动缩放" aria-hidden="true"></div>');
}

function bindPanelHeaderActions($panel) {
    $panel.find('.floating-mvu-collapse-btn').off('click.floatingMvu').on('click.floatingMvu', (event) => {
        event.stopPropagation();
        collapsePanel();
    });

    $panel.find('.floating-mvu-settings-btn').off('click.floatingMvu').on('click.floatingMvu', (event) => {
        event.stopPropagation();
        showPresetPicker();
    });

    $panel.find('.floating-mvu-theme-btn').off('click.floatingMvu').on('click.floatingMvu', (event) => {
        event.stopPropagation();
        openThemeManager();
    });

    $panel.find('.floating-mvu-refresh-btn').off('click.floatingMvu').on('click.floatingMvu', (event) => {
        event.stopPropagation();
        void runMvuPanelRefresh();
    });
}

function upgradeLegacyDom() {
    const $panel = $(`#${PANEL_ID}`);
    if (!$panel.length) {
        return;
    }

    const $header = $panel.find('.floating-mvu-header').first();
    const $title = $header.find('.floating-mvu-title').first();
    if ($header.hasClass('floating-mvu-panel-drag-handle')) {
        $header.removeClass('floating-mvu-panel-drag-handle');
        $title.addClass('floating-mvu-panel-drag-handle');
    }

    const $body = $panel.find('.floating-mvu-body');
    if ($body.length && !$body.attr('id')) {
        $body.attr('id', PANEL_CONTENT_ID);
    }

    const $actions = $panel.find('.floating-mvu-header-actions');
    if ($actions.length && !$panel.find('.floating-mvu-refresh-btn').length) {
        $actions.prepend(`
            <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-arrows-rotate floating-mvu-refresh-btn floating-mvu-header-btn-hidden" title="刷新" aria-label="刷新"></button>
        `);
    }
    if ($actions.length && !$panel.find('.floating-mvu-theme-btn').length) {
        $actions.prepend(`
            <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-palette floating-mvu-theme-btn" title="面板配色" aria-label="面板配色"></button>
        `);
    }
    if ($actions.length && !$panel.find('.floating-mvu-settings-btn').length) {
        $actions.prepend(`
            <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-gear floating-mvu-settings-btn" title="预设与配置" aria-label="预设与配置"></button>
        `);
    }

    const $fab = $(`#${FAB_ID}`);
    if ($fab.length) {
        bindFabDrag($fab);
    }
    ensurePanelTitleChrome();
    ensureFabUpdateBadge();

    ensurePanelResizeHandle($panel);
    bindPanelHeaderActions($panel);
    bindPanelDrag($panel);
    bindPanelResize($panel);
}

function ensureDom() {
    if ($(`#${ROOT_ID}`).length) {
        upgradeLegacyDom();
        ensurePanelTitleChrome();
        ensureFabUpdateBadge();
        return;
    }

    const html = `
        <div id="${ROOT_ID}" class="floating-mvu-root floating-mvu-root-hidden">
            <button type="button" id="${FAB_ID}" class="floating-mvu-fab" title="Floating MVU" aria-label="Floating MVU">
                <img class="floating-mvu-fab-avatar" alt="" draggable="false" />
                <span class="floating-mvu-fab-update-badge" aria-hidden="true">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </span>
            </button>
            <div id="${PANEL_ID}" class="floating-mvu-panel floating-mvu-panel-collapsed">
                <div class="floating-mvu-header">
                    <span class="floating-mvu-title floating-mvu-panel-drag-handle">
                        <span class="floating-mvu-title-name">Floating MVU</span>
                        <span class="floating-mvu-title-status" aria-live="polite"></span>
                    </span>
                    <div class="floating-mvu-header-actions">
                        <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-arrows-rotate floating-mvu-refresh-btn floating-mvu-header-btn-hidden" title="刷新" aria-label="刷新"></button>
                        <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-palette floating-mvu-theme-btn" title="面板配色" aria-label="面板配色"></button>
                        <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-gear floating-mvu-settings-btn" title="预设与配置" aria-label="预设与配置"></button>
                        <button type="button" class="floating-mvu-icon-btn menu_button fa-solid fa-minus floating-mvu-collapse-btn" title="收起面板" aria-label="收起面板"></button>
                    </div>
                </div>
                <div id="${PANEL_CONTENT_ID}" class="floating-mvu-body"></div>
                <div class="floating-mvu-panel-resize-handle" title="拖动缩放" aria-hidden="true"></div>
            </div>
        </div>
    `;

    $('body').append(html);

    const $fab = $(`#${FAB_ID}`);
    const $panel = $(`#${PANEL_ID}`);

    bindFabDrag($fab);
    bindPanelHeaderActions($panel);
    bindPanelDrag($panel);
    bindPanelResize($panel);
    ensurePanelTitleChrome();
    ensureFabUpdateBadge();
}

/**
 * @param {SyncOptions} [options]
 */
export function syncFloatingMvuUi(options = {}) {
    ensureDom();

    const settings = getSettings();
    const $root = $(`#${ROOT_ID}`);
    const $fab = $(`#${FAB_ID}`);
    const $panel = $(`#${PANEL_ID}`);

    const inChat = isActiveChatContext();

    if (inChat) {
        const currentId = getActiveChatId();
        if (currentId !== lastChatId) {
            lastChatId = currentId;
            settings.panelExpanded = settings.defaultExpandPanel;
            saveSettings();
            resetPanelViewToMain();
            applyActiveTheme();
        }
        updateFabAvatar();
    } else {
        lastChatId = undefined;
        settings.panelExpanded = false;
        $panel.addClass('floating-mvu-panel-collapsed');
        saveSettings();
    }

    const shouldShow = settings.enabled && inChat && settings.autoShowInChat;
    $root.toggleClass('floating-mvu-root-hidden', !shouldShow);

    if (!shouldShow) {
        return;
    }

    refreshPanelView();

    const fabPos = options.repositionDefaults ? null : settings.fab;
    const panelPos = options.repositionDefaults ? null : settings.panel;

    applyElementPosition($fab, fabPos, getDefaultFabPosition());
    applyElementPosition($panel, panelPos, getDefaultPanelPosition());
    applyPanelSize($panel, options.repositionDefaults ? null : settings.panelSize);
    ensurePanelResizeHandle($panel);
    bindPanelResize($panel);
    $panel.toggleClass('floating-mvu-panel-collapsed', !settings.panelExpanded);

    applyActiveTheme();
    syncPanelHeaderRefreshButton();
    applyPanelChromeI18n();
    bindCandidateListFabFollow();
    refreshCandidateList();

    requestAnimationFrame(() => clampAllFloatingMvuElements());
}
