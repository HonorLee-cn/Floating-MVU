import {
    clampPanelDimensions,
    getViewportPanelMaxSize,
    MIN_PANEL_HEIGHT,
    MIN_PANEL_WIDTH,
} from './viewport.js';

const RESIZE_EVENT_NS = '.floatingMvuResize';

/**
 * @param {JQuery<HTMLElement>} $panel
 * @param {() => void} [onResizeEnd]
 */
export function makePanelResizable($panel, onResizeEnd) {
    const $handle = $panel.find('.floating-mvu-panel-resize-handle');
    if (!$handle.length) {
        return;
    }

    $handle.off(`pointerdown${RESIZE_EVENT_NS}`);

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    $handle.on(`pointerdown${RESIZE_EVENT_NS}`, (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const originalEvent = event.originalEvent;
        if (!(originalEvent instanceof PointerEvent)) {
            return;
        }

        pointerId = originalEvent.pointerId;
        startX = originalEvent.clientX;
        startY = originalEvent.clientY;
        startWidth = $panel.outerWidth() ?? MIN_PANEL_WIDTH;
        startHeight = $panel.outerHeight() ?? MIN_PANEL_HEIGHT;

        $panel.addClass('floating-mvu-panel-resizing');
        $handle[0]?.setPointerCapture(pointerId);
        event.preventDefault();
        event.stopPropagation();

        const onMove = (moveEvent) => {
            if (!(moveEvent instanceof PointerEvent) || moveEvent.pointerId !== pointerId) {
                return;
            }
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const { maxWidth, maxHeight } = getViewportPanelMaxSize();
            const { width, height } = clampPanelDimensions(startWidth + deltaX, startHeight + deltaY);
            $panel.css({
                width: `${width}px`,
                height: `${height}px`,
                maxHeight: `${height}px`,
                maxWidth: `${maxWidth}px`,
            });
        };

        const onUp = (upEvent) => {
            if (!(upEvent instanceof PointerEvent) || upEvent.pointerId !== pointerId) {
                return;
            }
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            if ($handle[0]?.hasPointerCapture(pointerId)) {
                $handle[0].releasePointerCapture(pointerId);
            }
            pointerId = null;
            $panel.removeClass('floating-mvu-panel-resizing');
            onResizeEnd?.();
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });
}
