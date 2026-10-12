import { debounce } from '../../../../utils.js';
import { FAB_ID, PANEL_ID } from '../settings.js';

const VIEWPORT_MARGIN_PX = 8;

/** 与 dom / resize 一致：面板相对视口的最小留白 */
const PANEL_HORIZONTAL_INSET_PX = 48;
const PANEL_VERTICAL_INSET_PX = 80;

export const MIN_PANEL_WIDTH = 260;
export const MIN_PANEL_HEIGHT = 160;

/** 面板整体高度低于此值时隐藏内容区滚动条（仍可滚动） */
export const PANEL_HIDE_SCROLLBAR_MAX_HEIGHT = 420;

/**
 * @returns {{ maxWidth: number, maxHeight: number }}
 */
export function getViewportPanelMaxSize() {
    return {
        maxWidth: Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_HORIZONTAL_INSET_PX),
        maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_VERTICAL_INSET_PX),
    };
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number }}
 */
export function clampPanelDimensions(width, height) {
    const { maxWidth, maxHeight } = getViewportPanelMaxSize();
    return {
        width: Math.round(Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, width))),
        height: Math.round(Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, height))),
    };
}

/**
 * @param {JQuery<HTMLElement>} $panel
 * @returns {boolean} 是否调整了尺寸
 */
export function fitPanelSizeToViewport($panel) {
    const element = $panel.get(0);
    if (!element) {
        return false;
    }
    const beforeW = element.offsetWidth;
    const beforeH = element.offsetHeight;
    const { width, height } = clampPanelDimensions(beforeW, beforeH);
    if (width === beforeW && height === beforeH) {
        return false;
    }
    $panel.css({
        width: `${width}px`,
        height: `${height}px`,
        maxHeight: `${height}px`,
    });
    return true;
}

/**
 * @param {JQuery<HTMLElement>} $el
 * @param {number} [margin]
 */
export function clampElementToViewport($el, margin = VIEWPORT_MARGIN_PX) {
    const element = $el.get(0);
    if (!element) {
        return;
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const left = Math.min(Math.max(margin, rect.left), maxLeft);
    const top = Math.min(Math.max(margin, rect.top), maxTop);

    $el.css({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        right: 'auto',
        bottom: 'auto',
        margin: 'unset',
    });
}

/**
 * @param {JQuery<HTMLElement>} [$panel]
 */
export function syncPanelBodyScrollbarVisibility($panel) {
    const $el = $panel?.length ? $panel : $(`#${PANEL_ID}`);
    if (!$el.length) {
        return;
    }
    const height = $el.outerHeight() ?? 0;
    const hide = height > 0 && height <= PANEL_HIDE_SCROLLBAR_MAX_HEIGHT;
    $el.find('.floating-mvu-body').toggleClass('floating-mvu-body--scrollbars-hidden', hide);
}

export function clampAllFloatingMvuElements() {
    const $fab = $(`#${FAB_ID}`);
    if ($fab.length) {
        clampElementToViewport($fab);
    }

    const $panel = $(`#${PANEL_ID}`);
    if ($panel.length && !$panel.hasClass('floating-mvu-panel-collapsed')) {
        fitPanelSizeToViewport($panel);
        clampElementToViewport($panel);
        syncPanelBodyScrollbarVisibility($panel);
    }
}

/** @type {boolean} */
let listenersRegistered = false;

/**
 * @param {() => void} onViewportChange
 */
export function registerViewportListeners(onViewportChange) {
    if (listenersRegistered) {
        return;
    }
    listenersRegistered = true;

    const handler = debounce(() => {
        onViewportChange?.();
    }, 150);

    window.addEventListener('resize', handler);
}
