import { escapeHtml } from '../../../../utils.js';
import { t } from '../i18n/index.js';
import { applyMvuTextVariableMacros } from '../mvu/text-macros.js';
import {
    createDivider,
    createGroup,
    createVariable,
    isRootGroup,
    removeDividerFromPreset,
} from '../mvu/schema.js';
import { renderConfigDividerHtml, renderPanelDividerHtml } from './divider-block.js';
import { groupHasVisibleTitle, openGroupEditor, renderGroupHeaderLabel } from './group-editor.js';
import { bindConfigPanelSortable, createConfigSortItem } from './config-sortable.js';
import { openVariableEditor, renderVariableBlockHtml } from './variable-editor.js';

/**
 * @typedef {object} ConfigPanelHandlers
 * @property {() => void} [onChange]
 */

/**
 * @typedef {object} RenderGroupContext
 * @property {JQuery<HTMLElement>} $mount
 * @property {import('../mvu/schema.js').MvuPreset} preset
 * @property {ConfigPanelHandlers} handlers
 */

/**
 * @param {JQuery<HTMLElement>} $stack
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @param {RenderGroupContext} ctx
 */
function appendGroupChildNodes($stack, group, ctx) {
    $stack.attr('data-config-sort-stack', 'true');
    $stack.attr('data-owner-group-id', group.id);

    for (const child of group.children) {
        const $item = createConfigSortItem(child);
        const $body = $item.find('.floating-mvu-config-sort-item-body');
        if (child.type === 'divider') {
            $body.append(renderConfigDividerHtml(child.id));
        } else if (child.type === 'variable') {
            $body.append(renderVariableBlockHtml(child, { editable: true }));
        } else {
            $body.append(buildGroupElement(child, ctx));
        }
        $stack.append($item);
    }

    if (!group.children.length) {
        $stack.append(`<p class="floating-mvu-placeholder floating-mvu-group-empty">${escapeHtml(t('config.emptyGroup'))}</p>`);
    }
}

/**
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @param {RenderGroupContext} ctx
 * @returns {JQuery<HTMLElement>}
 */
function buildGroupElement(group, ctx) {
    const root = isRootGroup(group);
    const noNameClass = !root && !groupHasVisibleTitle(group) ? ' floating-mvu-group-box--no-name' : '';
    const boxClass = root
        ? 'floating-mvu-group group-outer floating-mvu-group-stack floating-mvu-group-root'
        : `floating-mvu-group-box${noNameClass}`;

    const titleLabel = renderGroupHeaderLabel(group);
    const headerNoTitleClass = titleLabel ? '' : ' floating-mvu-group-box-header--no-title';
    const titleHtml = titleLabel ? `<span class="floating-mvu-group-box-title">${titleLabel}</span>` : '';

    const $box = $(`
        <div class="${boxClass}" data-group-id="${escapeHtml(group.id)}">
            <div class="floating-mvu-group-box-header${headerNoTitleClass}">
                ${titleHtml}
                <div class="floating-mvu-group-box-actions flex-container flexGap5">
                    <button type="button" class="menu_button floating-mvu-add-variable" title="${escapeHtml(t('var.add'))}">
                        <i class="fa-solid fa-plus"></i><span>${escapeHtml(t('var.add'))}</span>
                    </button>
                    <button type="button" class="menu_button floating-mvu-add-group" title="${escapeHtml(t('var.addGroup'))}">
                        <i class="fa-solid fa-folder-plus"></i><span>${escapeHtml(t('var.addGroup'))}</span>
                    </button>
                    ${root ? `<button type="button" class="menu_button floating-mvu-add-divider" title="${escapeHtml(t('config.addDivider'))}">
                        <i class="fa-solid fa-minus"></i><span>${escapeHtml(t('config.addDivider'))}</span>
                    </button>` : ''}
                    ${root ? '' : `<button type="button" class="menu_button floating-mvu-edit-group" title="${escapeHtml(t('var.editGroup'))}"><i class="fa-solid fa-pen"></i></button>`}
                </div>
            </div>
            <div class="floating-mvu-group-box-stack"></div>
        </div>
    `);

    const $innerStack = $box.children('.floating-mvu-group-box-stack');
    appendGroupChildNodes($innerStack, group, ctx);

    bindGroupElementEvents($box, $innerStack, group, ctx);
    return $box;
}

/**
 * @param {JQuery<HTMLElement>} $box
 * @param {JQuery<HTMLElement>} $innerStack
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @param {RenderGroupContext} ctx
 */
function bindGroupElementEvents($box, $innerStack, group, ctx) {
    const { $mount, preset, handlers } = ctx;
    const $header = $box.children('.floating-mvu-group-box-header');

    const refresh = () => {
        renderConfigPanel($mount, preset, handlers);
        handlers.onChange?.();
    };

    $innerStack.on('click', '.floating-mvu-config-divider-delete', (event) => {
        event.stopPropagation();
        const dividerId = $(event.currentTarget).closest('.floating-mvu-config-divider').data('divider-id');
        if (!dividerId) {
            return;
        }
        removeDividerFromPreset(preset, String(dividerId));
        refresh();
    });

    $innerStack.on('click', '.floating-mvu-config-sort-item-body > .floating-mvu-var-block', function (event) {
        event.stopPropagation();
        const variableId = $(this).data('variable-id');
        if (!variableId) {
            return;
        }
        openVariableEditor($mount, preset, String(variableId), {
            onSaved: refresh,
            onDeleted: refresh,
        });
    });

    $header.find('.floating-mvu-add-variable').on('click', (event) => {
        event.stopPropagation();
        const variable = createVariable({ name: t('defaults.newVariable') });
        group.children.push(variable);
        renderConfigPanel($mount, preset, handlers);
        openVariableEditor($mount, preset, variable.id, {
            onSaved: refresh,
            onDeleted: refresh,
        });
        handlers.onChange?.();
    });

    $header.find('.floating-mvu-add-group').on('click', (event) => {
        event.stopPropagation();
        group.children.push(createGroup({ name: t('defaults.newGroup') }));
        refresh();
    });

    $header.find('.floating-mvu-add-divider').on('click', (event) => {
        event.stopPropagation();
        if (!isRootGroup(group)) {
            return;
        }
        group.children.push(createDivider());
        refresh();
    });

    $header.find('.floating-mvu-edit-group').on('click', (event) => {
        event.stopPropagation();
        openGroupEditor($mount, preset, group.id, {
            onSaved: refresh,
            onDeleted: refresh,
        });
    });
}

/**
 * @param {JQuery<HTMLElement>} $mount
 * @param {import('../mvu/schema.js').MvuPreset} preset
 * @param {ConfigPanelHandlers} [handlers]
 */
export function renderConfigPanel($mount, preset, handlers = {}) {
    $mount.empty();

    const ctx = { $mount, preset, handlers };

    const $panel = $(`
        <div class="floating-mvu-config-panel">
            <div class="floating-mvu-config-panel-mount-inner"></div>
        </div>
    `);

    const $inner = $panel.find('.floating-mvu-config-panel-mount-inner');
    $inner.append(buildGroupElement(preset.root, ctx));

    const refresh = () => {
        renderConfigPanel($mount, preset, handlers);
        handlers.onChange?.();
    };
    bindConfigPanelSortable($panel, preset, refresh);

    $mount.append($panel);
}

/**
 * @param {import('../mvu/schema.js').MvuVariableNode} variable
 * @param {Record<string, string | number>} [variableValues]
 */
function getReadonlyVariableRenderOptions(variable, variableValues = {}) {
    const name = String(variable.name ?? '').trim();
    if (!name || variableValues[name] === undefined) {
        return {};
    }
    const raw = variableValues[name];
    if (variable.varType === 'range') {
        const num = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(num) ? { rangeValue: num } : {};
    }
    if (variable.varType === 'text' || variable.varType === 'longtext') {
        return { textValue: applyMvuTextVariableMacros(String(raw)) };
    }
    return {};
}

/**
 * @param {JQuery<HTMLElement>} $container
 * @param {import('../mvu/schema.js').MvuGroupNode} group
 * @param {boolean} [readonly]
 * @param {Record<string, string | number>} [variableValues]
 */
export function appendReadonlyGroupTree($container, group, readonly = true, variableValues = {}) {
    const root = isRootGroup(group);
    const noNameClass = !root && !groupHasVisibleTitle(group) ? ' floating-mvu-group-box--no-name' : '';
    const boxClass = root
        ? 'floating-mvu-group group-outer floating-mvu-group-stack floating-mvu-group-readonly floating-mvu-group-root'
        : `floating-mvu-group-box floating-mvu-group-readonly${noNameClass}`;

    const $box = $(`<div class="${boxClass}"></div>`);

    if (!root && groupHasVisibleTitle(group)) {
        $box.append(`
            <div class="floating-mvu-group-box-header floating-mvu-group-box-header-readonly">
                <span class="floating-mvu-group-box-title">${renderGroupHeaderLabel(group)}</span>
            </div>
        `);
    }

    const $stack = $('<div class="floating-mvu-group-box-stack"></div>');
    const layoutVarsVertical = root;
    /** @type {JQuery<HTMLElement> | null} */
    let $flexRow = null;

    const flushFlexRow = () => {
        $flexRow = null;
    };

    for (const child of group.children) {
        if (child.type === 'divider') {
            flushFlexRow();
            $stack.append(renderPanelDividerHtml());
            continue;
        }
        if (child.type === 'variable') {
            if (layoutVarsVertical) {
                flushFlexRow();
                $stack.append(renderVariableBlockHtml(child, {
                    editable: false,
                    ...getReadonlyVariableRenderOptions(child, variableValues),
                }));
                continue;
            }
            if (!$flexRow) {
                $flexRow = $('<div class="floating-mvu-group-flex-row"></div>');
                $stack.append($flexRow);
            }
            $flexRow.append(renderVariableBlockHtml(child, {
                editable: false,
                ...getReadonlyVariableRenderOptions(child, variableValues),
            }));
            continue;
        }
        if (child.type === 'group') {
            flushFlexRow();
            appendReadonlyGroupTree($stack, child, readonly, variableValues);
        }
    }

    if (!group.children.length) {
        $stack.append(`<p class="floating-mvu-placeholder">${escapeHtml(t('config.groupNoVars'))}</p>`);
    }

    $box.append($stack);
    $container.append($box);

    if (readonly) {
        $box.find('.floating-mvu-var-block').removeAttr('title').css('cursor', 'default');
    }
}
