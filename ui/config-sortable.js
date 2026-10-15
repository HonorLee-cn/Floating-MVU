import { t } from '../i18n/index.js';
import { moveConfigChildInPreset } from '../mvu/schema.js';

const DRAG_MIME = 'application/x-floating-mvu-config-child-id';

/** @type {string | null} */
let activeDragChildId = null;

const DROP_SELECTOR = [
    '.floating-mvu-config-sort-item',
    '.floating-mvu-config-sort-item-body',
    '[data-config-sort-stack]',
    '.floating-mvu-group-empty',
].join(', ');

/**
 * @param {JQuery<HTMLElement>} $from
 * @returns {{ $stack: JQuery<HTMLElement>, beforeChildId: string | undefined } | null}
 */
function resolveDropTarget($from) {
    const $item = $from.closest('.floating-mvu-config-sort-item');
    if ($item.length) {
        const $stack = $item.parent('[data-config-sort-stack]');
        if (!$stack.length) {
            return null;
        }
        return {
            $stack,
            beforeChildId: $item.attr('data-sort-id') || undefined,
        };
    }

    const $stack = $from.closest('[data-config-sort-stack]');
    if (!$stack.length) {
        return null;
    }
    return { $stack, beforeChildId: undefined };
}

/**
 * @param {DragEvent | undefined} nativeEvent
 * @returns {string | null}
 */
function readDraggedChildId(nativeEvent) {
    if (!nativeEvent?.dataTransfer) {
        return activeDragChildId;
    }
    const fromCustom = nativeEvent.dataTransfer.getData(DRAG_MIME);
    const fromPlain = nativeEvent.dataTransfer.getData('text/plain');
    return fromCustom || fromPlain || activeDragChildId;
}

/**
 * @param {JQuery<HTMLElement>} $panel
 * @param {import('../mvu/schema.js').MvuPreset} preset
 * @param {() => void} refresh
 */
export function bindConfigPanelSortable($panel, preset, refresh) {
    $panel.off('.floatingMvuSort');

    $panel.on('click.floatingMvuSort mousedown.floatingMvuSort', '.floating-mvu-config-drag-handle', (event) => {
        event.stopPropagation();
    });

    $panel.on('dragstart.floatingMvuSort', '.floating-mvu-config-drag-handle', function (event) {
        const nativeEvent = event.originalEvent;
        if (!nativeEvent?.dataTransfer) {
            return;
        }
        const $item = $(this).closest('.floating-mvu-config-sort-item');
        const childId = $item.attr('data-sort-id');
        if (!childId) {
            event.preventDefault();
            return;
        }
        activeDragChildId = childId;
        nativeEvent.dataTransfer.setData('text/plain', childId);
        try {
            nativeEvent.dataTransfer.setData(DRAG_MIME, childId);
        } catch {
            // Some environments only allow text/plain in drag data.
        }
        nativeEvent.dataTransfer.effectAllowed = 'move';
        $item.addClass('floating-mvu-config-sort-item-dragging');
        event.stopPropagation();
    });

    $panel.on('dragend.floatingMvuSort', '.floating-mvu-config-drag-handle', function () {
        activeDragChildId = null;
        $(this).closest('.floating-mvu-config-sort-item').removeClass('floating-mvu-config-sort-item-dragging');
        $panel.find('.floating-mvu-config-sort-drop-target').removeClass('floating-mvu-config-sort-drop-target');
    });

    $panel.on('dragover.floatingMvuSort', DROP_SELECTOR, function (event) {
        event.preventDefault();
        if (event.originalEvent?.dataTransfer) {
            event.originalEvent.dataTransfer.dropEffect = 'move';
        }
        $panel.find('.floating-mvu-config-sort-drop-target').removeClass('floating-mvu-config-sort-drop-target');
        const $item = $(this).closest('.floating-mvu-config-sort-item');
        if ($item.length) {
            $item.addClass('floating-mvu-config-sort-drop-target');
        } else {
            $(this).closest('[data-config-sort-stack]').addClass('floating-mvu-config-sort-drop-target');
        }
    });

    $panel.on('dragleave.floatingMvuSort', DROP_SELECTOR, function (event) {
        const related = event.relatedTarget;
        if (related instanceof Node && this.contains(related)) {
            return;
        }
        $(this).closest('.floating-mvu-config-sort-item, [data-config-sort-stack]').removeClass('floating-mvu-config-sort-drop-target');
    });

    $panel.on('drop.floatingMvuSort', DROP_SELECTOR, function (event) {
        event.preventDefault();
        event.stopPropagation();
        activeDragChildId = null;
        $panel.find('.floating-mvu-config-sort-drop-target').removeClass('floating-mvu-config-sort-drop-target');

        const draggedId = readDraggedChildId(event.originalEvent);
        if (!draggedId) {
            return;
        }

        const dropCtx = resolveDropTarget($(this));
        if (!dropCtx) {
            return;
        }

        const ownerGroupId = dropCtx.$stack.attr('data-owner-group-id');
        if (!ownerGroupId) {
            return;
        }

        if (dropCtx.beforeChildId === draggedId) {
            return;
        }

        const moved = moveConfigChildInPreset(preset, draggedId, ownerGroupId, dropCtx.beforeChildId);
        if (!moved) {
            return;
        }

        refresh();
    });
}

/**
 * @param {import('../mvu/schema.js').MvuNode} child
 * @returns {JQuery<HTMLElement>}
 */
export function createConfigSortItem(child) {
    const kind = child.type;
    const id = child.id;
    const varTypeAttr = kind === 'variable'
        ? ` data-var-type="${child.varType}"`
        : '';
    const dividerClass = kind === 'divider' ? ' floating-mvu-config-sort-item--divider' : '';
    return $(`
        <div class="floating-mvu-config-sort-item${dividerClass}" data-sort-kind="${kind}" data-sort-id="${id}"${varTypeAttr}>
            <button type="button" class="floating-mvu-config-drag-handle menu_button" title="${t('var.dragSort')}" aria-label="${t('var.dragSort')}" draggable="true">
                <i class="fa-solid fa-grip-vertical"></i>
            </button>
            <div class="floating-mvu-config-sort-item-body"></div>
        </div>
    `);
}
