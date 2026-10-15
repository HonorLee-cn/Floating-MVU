import { uuidv4 } from '../../../../utils.js';

/**
 * @typedef {object} MvuVariableNode
 * @property {'variable'} type
 * @property {string} id
 * @property {string} name
 * @property {'text' | 'longtext' | 'range' | 'image'} varType
 * @property {string} description
 * @property {number} [textMaxLength] 长文本最大字数；未设置表示不限制
 * @property {number} [rangeMin] 范围数值下限，默认 0
 * @property {number} [rangeMax] 范围数值上限，默认 100
 * @property {string} [rangeFillColor] 进度条填充色，覆盖主题默认渐变
 * @property {string} [imageUrl] 图片 URL（image 类型）
 * @property {number} [imageHeightPx] 图片显示高度 px（image 类型）
 * @property {boolean} [includeInWorldInfo] 是否写入世界书 MVU-VARS 条目，默认 true（image 不参与）
 */

export const DEFAULT_RANGE_MIN = 0;
export const DEFAULT_RANGE_MAX = 100;
export const DEFAULT_IMAGE_HEIGHT_PX = 120;

/**
 * @typedef {object} MvuDividerNode
 * @property {'divider'} type
 * @property {string} id
 */

/**
 * @typedef {object} MvuGroupNode
 * @property {'group'} type
 * @property {string} id
 * @property {string} [name]
 * @property {string} [cssClass]
 * @property {(MvuVariableNode | MvuGroupNode | MvuDividerNode)[]} children
 */

/**
 * @typedef {MvuVariableNode | MvuGroupNode | MvuDividerNode} MvuNode
 */

/**
 * @typedef {object} MvuPreset
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} updatedAt
 * @property {MvuGroupNode} root
 * @property {boolean} [autoUpdateOnMessageReceived] 接收对话后自动更新面板，默认 true
 * @property {boolean} [autoCandidateReplies] 是否在 MVU 更新时一并生成候选回复，默认 false
 * @property {number} [maxCandidateCount] 候选条数上限 1~5，默认 3
 * @property {Partial<Record<MvuCandidateType, boolean>>} [candidateTypes] 各候选类型是否参与 MVU 生成
 * @property {boolean} [syncVariablesToWorldInfo] 是否将变量状态同步到世界书 MVU-VARS 条目
 */

export const MIN_CANDIDATE_COUNT = 1;
export const MAX_CANDIDATE_COUNT = 5;
export const DEFAULT_MAX_CANDIDATE_COUNT = 3;
export const MAX_CANDIDATE_CONTENT_LENGTH = 20;

/** @typedef {'plot' | 'action' | 'dialogue' | 'director'} MvuCandidateType */

/**
 * @typedef {object} MvuCandidateItem
 * @property {MvuCandidateType} type
 * @property {string} content
 */

export const MVU_CANDIDATE_TYPES = /** @type {const} */ (['plot', 'action', 'dialogue', 'director']);

/**
 * @param {boolean} [allEnabled=true]
 * @returns {Record<MvuCandidateType, boolean>}
 */
export function createDefaultCandidateTypes(allEnabled = true) {
    /** @type {Record<MvuCandidateType, boolean>} */
    const map = {
        plot: allEnabled,
        action: allEnabled,
        dialogue: allEnabled,
        director: allEnabled,
    };
    return map;
}

/**
 * @returns {MvuGroupNode}
 */
export function createRootGroup() {
    return {
        type: 'group',
        id: uuidv4(),
        name: '',
        cssClass: 'group-outer',
        children: [],
    };
}

/**
 * @param {Partial<MvuGroupNode>} [overrides]
 * @returns {MvuGroupNode}
 */
export function createGroup(overrides = {}) {
    return {
        type: 'group',
        id: uuidv4(),
        name: '新分组',
        children: [],
        ...overrides,
    };
}

/**
 * @param {Partial<MvuVariableNode>} [overrides]
 * @returns {MvuVariableNode}
 */
export function createVariable(overrides = {}) {
    return {
        type: 'variable',
        id: uuidv4(),
        name: '',
        varType: 'text',
        description: '',
        includeInWorldInfo: true,
        ...overrides,
    };
}

/**
 * @param {Partial<MvuDividerNode>} [overrides]
 * @returns {MvuDividerNode}
 */
export function createDivider(overrides = {}) {
    return {
        type: 'divider',
        id: uuidv4(),
        ...overrides,
    };
}

/**
 * @param {Partial<MvuPreset>} [overrides]
 * @returns {MvuPreset}
 */
export function createPreset(overrides = {}) {
    const now = Date.now();
    return {
        id: uuidv4(),
        name: '新预设',
        description: '',
        updatedAt: now,
        root: createRootGroup(),
        autoUpdateOnMessageReceived: true,
        autoCandidateReplies: false,
        maxCandidateCount: DEFAULT_MAX_CANDIDATE_COUNT,
        candidateTypes: createDefaultCandidateTypes(true),
        syncVariablesToWorldInfo: false,
        ...overrides,
    };
}

/**
 * @param {MvuPreset} preset
 * @returns {boolean}
 */
export function isPresetAutoUpdateOnMessageReceived(preset) {
    return preset.autoUpdateOnMessageReceived !== false;
}

/**
 * @param {MvuPreset} preset
 * @returns {boolean}
 */
export function isPresetAutoCandidateReplies(preset) {
    return preset.autoCandidateReplies === true;
}

/**
 * @param {MvuPreset} preset
 * @returns {MvuCandidateType[]}
 */
export function getPresetEnabledCandidateTypes(preset) {
    const types = preset.candidateTypes;
    if (!types || typeof types !== 'object') {
        return [];
    }
    return MVU_CANDIDATE_TYPES.filter(type => types[type] === true);
}

/**
 * @param {MvuPreset} preset
 * @returns {boolean}
 */
export function isPresetCandidatesEnabled(preset) {
    return isPresetAutoCandidateReplies(preset) && getPresetEnabledCandidateTypes(preset).length > 0;
}

/**
 * @param {MvuPreset} preset
 * @returns {boolean}
 */
export function isPresetWorldInfoSyncEnabled(preset) {
    return preset.syncVariablesToWorldInfo === true;
}

/**
 * @param {MvuPreset} preset
 * @returns {MvuVariableNode[]}
 */
export function getVariablesForWorldInfo(preset) {
    return getPresetVariables(preset).filter(v =>
        v.varType !== 'image'
        && v.includeInWorldInfo !== false
        && String(v.name ?? '').trim(),
    );
}

/**
 * @param {MvuPreset} preset
 * @returns {number}
 */
export function getPresetMaxCandidateCount(preset) {
    const n = Number(preset.maxCandidateCount);
    if (!Number.isFinite(n)) {
        return DEFAULT_MAX_CANDIDATE_COUNT;
    }
    return Math.min(MAX_CANDIDATE_COUNT, Math.max(MIN_CANDIDATE_COUNT, Math.round(n)));
}

/**
 * @param {string} varType
 * @returns {'text' | 'longtext' | 'range' | 'image'}
 */
export function normalizeVariableType(varType) {
    if (varType === 'range' || varType === 'longtext' || varType === 'image') {
        return varType;
    }
    return 'text';
}

/**
 * @param {MvuVariableNode} variable
 * @returns {{ min: number, max: number }}
 */
export function getVariableRangeBounds(variable) {
    let min = Number(variable.rangeMin);
    let max = Number(variable.rangeMax);
    if (!Number.isFinite(min)) {
        min = DEFAULT_RANGE_MIN;
    }
    if (!Number.isFinite(max)) {
        max = DEFAULT_RANGE_MAX;
    }
    if (min >= max) {
        max = min + 1;
    }
    return { min, max };
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeRangeFillColorStored(raw) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return null;
    }
    if (/^#[0-9a-fA-F]{6}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }
    if (/^rgba?\(/i.test(trimmed)) {
        return trimmed;
    }
    return null;
}

/**
 * @param {MvuVariableNode} variable
 * @returns {number}
 */
export function getVariableImageHeightPx(variable) {
    const n = Number(variable.imageHeightPx);
    if (!Number.isFinite(n) || n <= 0) {
        return DEFAULT_IMAGE_HEIGHT_PX;
    }
    return Math.min(2000, Math.max(24, Math.round(n)));
}

/**
 * @param {MvuVariableNode} variable
 */
function normalizeVariableTypeOptions(variable) {
    if (variable.varType === 'longtext') {
        const raw = variable.textMaxLength;
        if (raw === null || raw === undefined || raw === '') {
            delete variable.textMaxLength;
        } else {
            const n = Number(raw);
            if (!Number.isFinite(n) || n <= 0) {
                delete variable.textMaxLength;
            } else {
                variable.textMaxLength = Math.floor(n);
            }
        }
        delete variable.rangeMin;
        delete variable.rangeMax;
        delete variable.rangeFillColor;
        delete variable.imageUrl;
        delete variable.imageHeightPx;
        return;
    }

    delete variable.textMaxLength;

    if (variable.varType === 'range') {
        const bounds = getVariableRangeBounds(variable);
        variable.rangeMin = bounds.min;
        variable.rangeMax = bounds.max;
        delete variable.imageUrl;
        delete variable.imageHeightPx;
        const fill = normalizeRangeFillColorStored(variable.rangeFillColor);
        if (fill) {
            variable.rangeFillColor = fill;
        } else {
            delete variable.rangeFillColor;
        }
        return;
    }

    delete variable.rangeMin;
    delete variable.rangeMax;
    delete variable.rangeFillColor;

    if (variable.varType === 'image') {
        variable.name = '';
        variable.description = '';
        variable.imageUrl = typeof variable.imageUrl === 'string' ? variable.imageUrl.trim() : '';
        variable.imageHeightPx = getVariableImageHeightPx(variable);
        delete variable.includeInWorldInfo;
        return;
    }

    delete variable.imageUrl;
    delete variable.imageHeightPx;
    if (variable.includeInWorldInfo === undefined) {
        variable.includeInWorldInfo = true;
    } else {
        variable.includeInWorldInfo = Boolean(variable.includeInWorldInfo);
    }
}

function ensureVariableShape(variable) {
    variable.varType = normalizeVariableType(variable.varType);
    if (!variable.id) {
        variable.id = uuidv4();
    }
    if (typeof variable.name !== 'string') {
        variable.name = '';
    }
    if (typeof variable.description !== 'string') {
        variable.description = '';
    }
    normalizeVariableTypeOptions(variable);
}

/**
 * @param {MvuGroupNode} group
 * @param {boolean} isRoot
 */
function ensureGroupShape(group, isRoot = false) {
    if (!group.id) {
        group.id = uuidv4();
    }
    if (typeof group.name !== 'string') {
        group.name = '';
    }
    if (isRoot) {
        group.cssClass = 'group-outer';
    } else if (group.cssClass === 'group-outer') {
        delete group.cssClass;
    }
    if (!Array.isArray(group.children)) {
        group.children = [];
    }
    group.children = group.children.filter(child => {
        if (child?.type === 'divider') {
            return isRoot;
        }
        return child?.type === 'variable' || child?.type === 'group';
    });
    for (const child of group.children) {
        if (child.type === 'variable') {
            ensureVariableShape(child);
        } else if (child.type === 'group') {
            ensureGroupShape(child, false);
        } else if (child.type === 'divider') {
            if (!child.id) {
                child.id = uuidv4();
            }
        }
    }
}

/**
 * @param {MvuPreset} preset
 * @returns {MvuPreset}
 */
export function ensurePresetShape(preset) {
    if (!preset.root || preset.root.type !== 'group') {
        preset.root = createRootGroup();
    }
    ensureGroupShape(preset.root, true);
    if (typeof preset.name !== 'string') {
        preset.name = '';
    }
    if (typeof preset.description !== 'string') {
        preset.description = '';
    }
    if (!preset.updatedAt) {
        preset.updatedAt = Date.now();
    }
    if (preset.autoUpdateOnMessageReceived === undefined) {
        preset.autoUpdateOnMessageReceived = true;
    } else {
        preset.autoUpdateOnMessageReceived = Boolean(preset.autoUpdateOnMessageReceived);
    }
    if (preset.autoCandidateReplies === undefined) {
        preset.autoCandidateReplies = false;
    } else {
        preset.autoCandidateReplies = Boolean(preset.autoCandidateReplies);
    }
    preset.maxCandidateCount = getPresetMaxCandidateCount(preset);
    if (!preset.candidateTypes || typeof preset.candidateTypes !== 'object') {
        const legacyAllOn = preset.autoCandidateReplies === true;
        preset.candidateTypes = createDefaultCandidateTypes(legacyAllOn);
    } else {
        /** @type {Record<MvuCandidateType, boolean>} */
        const normalized = createDefaultCandidateTypes(false);
        for (const type of MVU_CANDIDATE_TYPES) {
            normalized[type] = preset.candidateTypes[type] === true;
        }
        preset.candidateTypes = normalized;
    }
    if (preset.syncVariablesToWorldInfo === undefined) {
        preset.syncVariablesToWorldInfo = false;
    } else {
        preset.syncVariablesToWorldInfo = Boolean(preset.syncVariablesToWorldInfo);
    }
    return preset;
}

/**
 * @param {MvuGroupNode} group
 * @param {string} groupId
 * @returns {MvuGroupNode | null}
 */
export function findGroupById(group, groupId) {
    if (group.id === groupId) {
        return group;
    }
    for (const child of group.children) {
        if (child.type === 'group') {
            const found = findGroupById(child, groupId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * @param {MvuPreset} preset
 * @param {string} groupId
 * @returns {MvuGroupNode | null}
 */
export function findGroupInPreset(preset, groupId) {
    return findGroupById(preset.root, groupId);
}

/**
 * @param {MvuGroupNode} parent
 * @param {string} childId
 * @param {string} [beforeChildId] insert before this sibling; omit to append
 * @returns {boolean}
 */
export function reorderGroupChild(parent, childId, beforeChildId) {
    const fromIndex = parent.children.findIndex(c => c.id === childId);
    if (fromIndex < 0) {
        return false;
    }

    /** @type {number} */
    let toIndex;
    if (beforeChildId) {
        toIndex = parent.children.findIndex(c => c.id === beforeChildId);
        if (toIndex < 0) {
            return false;
        }
        if (fromIndex === toIndex || fromIndex === toIndex - 1) {
            return false;
        }
    } else {
        if (fromIndex === parent.children.length - 1) {
            return false;
        }
        toIndex = parent.children.length;
    }

    const [item] = parent.children.splice(fromIndex, 1);
    if (beforeChildId) {
        if (fromIndex < toIndex) {
            toIndex--;
        }
        parent.children.splice(toIndex, 0, item);
    } else {
        parent.children.push(item);
    }
    return true;
}

/**
 * @param {MvuGroupNode} root
 * @param {string} childId
 * @returns {MvuGroupNode | null}
 */
export function findParentGroupOfChild(root, childId) {
    for (const child of root.children) {
        if (child.id === childId) {
            return root;
        }
    }
    for (const child of root.children) {
        if (child.type === 'group') {
            const found = findParentGroupOfChild(child, childId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * @param {MvuPreset} preset
 * @param {string} childId
 * @param {string} targetParentGroupId
 * @param {string} [beforeChildId]
 * @returns {boolean}
 */
export function moveConfigChildInPreset(preset, childId, targetParentGroupId, beforeChildId) {
    const sourceParent = findParentGroupOfChild(preset.root, childId);
    const targetParent = findGroupInPreset(preset, targetParentGroupId);
    if (!sourceParent || !targetParent) {
        return false;
    }

    const fromIndex = sourceParent.children.findIndex(c => c.id === childId);
    if (fromIndex < 0) {
        return false;
    }

    const item = sourceParent.children[fromIndex];
    if (item.type === 'group' && findGroupById(item, targetParentGroupId)) {
        return false;
    }

    if (item.type === 'divider' && targetParent.id !== preset.root.id) {
        return false;
    }

    if (sourceParent.id === targetParent.id) {
        return reorderGroupChild(sourceParent, childId, beforeChildId);
    }

    /** @type {number} */
    let toIndex;
    if (beforeChildId) {
        toIndex = targetParent.children.findIndex(c => c.id === beforeChildId);
        if (toIndex < 0) {
            toIndex = targetParent.children.length;
        }
    } else {
        toIndex = targetParent.children.length;
    }

    sourceParent.children.splice(fromIndex, 1);
    targetParent.children.splice(toIndex, 0, item);
    return true;
}

/**
 * @param {MvuGroupNode} group
 * @param {string} variableId
 * @returns {MvuVariableNode | null}
 */
function findVariableInGroup(group, variableId) {
    for (const child of group.children) {
        if (child.type === 'variable' && child.id === variableId) {
            return child;
        }
        if (child.type === 'group') {
            const found = findVariableInGroup(child, variableId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * @param {MvuPreset} preset
 * @param {string} variableId
 * @returns {MvuVariableNode | null}
 */
export function findVariableInPreset(preset, variableId) {
    return findVariableInGroup(preset.root, variableId);
}

/**
 * @param {MvuGroupNode} group
 * @param {string} variableId
 * @returns {boolean}
 */
export function removeVariableFromGroup(group, variableId) {
    const before = group.children.length;
    group.children = group.children.filter(c => !(c.type === 'variable' && c.id === variableId));
    return group.children.length < before;
}

/**
 * @param {MvuPreset} preset
 * @param {string} variableId
 * @returns {boolean}
 */
export function removeVariableFromPreset(preset, variableId) {
    const parent = findParentGroupOfChild(preset.root, variableId);
    if (!parent) {
        return false;
    }
    return removeVariableFromGroup(parent, variableId);
}

/**
 * @param {MvuGroupNode} group
 * @param {string} dividerId
 * @returns {boolean}
 */
export function removeDividerFromGroup(group, dividerId) {
    const before = group.children.length;
    group.children = group.children.filter(c => !(c.type === 'divider' && c.id === dividerId));
    return group.children.length < before;
}

/**
 * @param {MvuPreset} preset
 * @param {string} dividerId
 * @returns {boolean}
 */
export function removeDividerFromPreset(preset, dividerId) {
    const parent = findParentGroupOfChild(preset.root, dividerId);
    if (!parent || parent.id !== preset.root.id) {
        return false;
    }
    return removeDividerFromGroup(parent, dividerId);
}

/**
 * @param {MvuGroupNode} parent
 * @param {string} groupId
 * @returns {boolean}
 */
export function removeGroupFromParent(parent, groupId) {
    if (parent.cssClass === 'group-outer' && parent.id === groupId) {
        return false;
    }
    const before = parent.children.length;
    parent.children = parent.children.filter(c => !(c.type === 'group' && c.id === groupId));
    if (parent.children.length < before) {
        return true;
    }
    for (const child of parent.children) {
        if (child.type === 'group' && removeGroupFromParent(child, groupId)) {
            return true;
        }
    }
    return false;
}

/**
 * @param {MvuPreset} preset
 * @param {string} groupId
 * @returns {boolean}
 */
export function removeGroupFromPreset(preset, groupId) {
    if (preset.root.id === groupId) {
        return false;
    }
    return removeGroupFromParent(preset.root, groupId);
}

/**
 * @param {MvuGroupNode} group
 * @returns {MvuVariableNode[]}
 */
export function collectVariablesFromGroup(group) {
    /** @type {MvuVariableNode[]} */
    const list = [];
    for (const child of group.children) {
        if (child.type === 'variable') {
            list.push(child);
        } else if (child.type === 'group') {
            list.push(...collectVariablesFromGroup(child));
        }
    }
    return list;
}

/**
 * @param {MvuPreset} preset
 * @returns {MvuVariableNode[]}
 */
export function getPresetVariables(preset) {
    return collectVariablesFromGroup(preset.root);
}

/**
 * @param {MvuGroupNode} group
 * @returns {boolean}
 */
export function isRootGroup(group) {
    return group.cssClass === 'group-outer';
}
