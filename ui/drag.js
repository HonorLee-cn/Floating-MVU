const CLICK_THRESHOLD_PX = 5;
const DRAG_EVENT_NS = '.floatingMvuDrag';

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"]';

/**
 * 嵌套在拖动手柄内的独立控件（如标题栏齿轮）不参与拖动；手柄自身若是 button（FAB）仍应可点。
 * @param {EventTarget | null | undefined} target
 * @param {JQuery<HTMLElement>} $handle
 * @returns {boolean}
 */
function shouldSkipDragForInteractiveChild(target, $handle) {
    if (!(target instanceof Element)) {
        return false;
    }
    const interactive = target.closest(INTERACTIVE_SELECTOR);
    if (!interactive) {
        return false;
    }
    const handleEl = $handle.get(0);
    if (!handleEl || interactive === handleEl) {
        return false;
    }
    return handleEl.contains(interactive);
}

/**
 * @typedef {object} DraggableOptions
 * @property {JQuery<HTMLElement>} [handle] Element that initiates drag
 * @property {(event: JQuery.TriggeredEvent) => void} [onClick] Fired when pointer up without significant movement
 * @property {() => void} [onDragEnd]
 */

/**
 * @param {JQuery<HTMLElement>} $target
 * @param {DraggableOptions} [options]
 */
export function makeDraggable($target, options = {}) {
    const $handle = options.handle ?? $target;
    let pointerId = null;
    let startClientX = 0;
    let startClientY = 0;
    let startOffsetLeft = 0;
    let startOffsetTop = 0;
    let moved = false;

    $handle.off(`pointerdown${DRAG_EVENT_NS} pointermove${DRAG_EVENT_NS} pointerup${DRAG_EVENT_NS} pointercancel${DRAG_EVENT_NS}`);

    $handle.css('touch-action', 'none');

    $handle.on(`pointerdown${DRAG_EVENT_NS}`, (event) => {
        if (shouldSkipDragForInteractiveChild(event.target, $handle)) {
            return;
        }

        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const originalEvent = event.originalEvent;
        if (!(originalEvent instanceof PointerEvent)) {
            return;
        }

        pointerId = originalEvent.pointerId;
        moved = false;
        startClientX = originalEvent.clientX;
        startClientY = originalEvent.clientY;

        const rect = $target[0].getBoundingClientRect();
        startOffsetLeft = rect.left;
        startOffsetTop = rect.top;

        $target.addClass('floating-mvu-dragging');
        $handle[0]?.setPointerCapture(pointerId);
        event.preventDefault();
    });

    $handle.on(`pointermove${DRAG_EVENT_NS}`, (event) => {
        const originalEvent = event.originalEvent;
        if (!(originalEvent instanceof PointerEvent) || originalEvent.pointerId !== pointerId) {
            return;
        }

        const deltaX = originalEvent.clientX - startClientX;
        const deltaY = originalEvent.clientY - startClientY;

        if (!moved && Math.hypot(deltaX, deltaY) >= CLICK_THRESHOLD_PX) {
            moved = true;
        }

        if (!moved) {
            return;
        }

        $target.css({
            top: `${startOffsetTop + deltaY}px`,
            left: `${startOffsetLeft + deltaX}px`,
            right: 'auto',
            bottom: 'auto',
            margin: 'unset',
        });
    });

    const finish = (event) => {
        const originalEvent = event.originalEvent;
        if (!(originalEvent instanceof PointerEvent) || originalEvent.pointerId !== pointerId) {
            return;
        }

        if ($handle[0]?.hasPointerCapture(pointerId)) {
            $handle[0].releasePointerCapture(pointerId);
        }

        pointerId = null;
        $target.removeClass('floating-mvu-dragging');

        if (!moved && typeof options.onClick === 'function') {
            options.onClick(event);
        }

        if (typeof options.onDragEnd === 'function') {
            options.onDragEnd();
        }
    };

    $handle.on(`pointerup${DRAG_EVENT_NS} pointercancel${DRAG_EVENT_NS}`, finish);
}
