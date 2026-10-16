import {
    characters,
    chat_metadata,
    saveMetadata,
    substituteParams,
    this_chid,
} from '../../../../../script.js';
import {
    createWorldInfoEntry,
    loadWorldInfo,
    METADATA_KEY as WORLD_INFO_METADATA_KEY,
    reloadEditor,
    saveWorldInfo,
    selected_world_info,
    world_info_position,
} from '../../../../world-info.js';
import { floatingMvuDebugTrace, floatingMvuDebugWarn } from '../debug-log.js';
import { t } from '../i18n/index.js';
import { getSettings } from '../settings.js';
import { ensureChatBindingObject } from './chat-preset.js';
import { getChatVariableValues } from './chat-variables.js';
import {
    getVariableRangeBounds,
    getVariablesForWorldInfo,
    isPresetWorldInfoSyncEnabled,
} from './schema.js';
import { applyMvuTextVariableMacros } from './text-macros.js';

/** 世界书列表中显示的条目标题（comment） */
export const MVU_WORLD_INFO_ENTRY_COMMENT = '【MVU-VARS】';
/** @deprecated 旧版无【】包裹，查找时仍识别以便迁移 */
const MVU_WORLD_INFO_ENTRY_COMMENT_LEGACY = 'MVU-VARS';
export const MVU_WORLD_INFO_AUTOMATION_ID = 'floating_mvu_vars';

/**
 * @param {unknown} comment
 * @returns {boolean}
 */
function isMvuVarsEntryComment(comment) {
    return comment === MVU_WORLD_INFO_ENTRY_COMMENT || comment === MVU_WORLD_INFO_ENTRY_COMMENT_LEGACY;
}

/** @type {ReturnType<typeof setTimeout> | null} */
let syncDebounceTimer = null;

/** @type {boolean} */
let warnedNoWorldBook = false;

/**
 * @returns {string | null}
 */
export function resolveWorldBookNameForChat() {
    const chatWorld = chat_metadata[WORLD_INFO_METADATA_KEY];
    if (typeof chatWorld === 'string' && chatWorld.trim()) {
        return chatWorld.trim();
    }

    const character = characters[this_chid];
    const charWorld = character?.data?.extensions?.world;
    if (typeof charWorld === 'string' && charWorld.trim()) {
        return charWorld.trim();
    }

    if (Array.isArray(selected_world_info) && selected_world_info.length) {
        const first = selected_world_info[0];
        if (typeof first === 'string' && first.trim()) {
            return first.trim();
        }
    }

    return null;
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
export function buildMvuWorldInfoContent(preset, values) {
    const heading = substituteParams('### {{char}} 角色状态');
    const lines = [heading];

    for (const variable of getVariablesForWorldInfo(preset)) {
        const name = String(variable.name ?? '').trim();
        if (!name) {
            continue;
        }
        const raw = values[name];
        if (raw === undefined || raw === null) {
            continue;
        }
        let text;
        if (variable.varType === 'range') {
            const { min, max } = getVariableRangeBounds(variable);
            text = `${String(raw)}(${min}~${max})`;
        } else {
            text = applyMvuTextVariableMacros(String(raw).trim());
        }
        if (!text.length) {
            continue;
        }
        const desc = String(variable.description ?? '').trim();
        lines.push(desc ? `${name}:${text} *${desc}*` : `${name}:${text}`);
    }

    lines.push('', t('worldInfo.syncUsageNotice'));
    return lines.join('\n');
}

/**
 * @param {object} data
 * @returns {{ uid: number, entry: Record<string, unknown> } | null}
 */
export function findMvuVarsEntry(data) {
    if (!data?.entries || typeof data.entries !== 'object') {
        return null;
    }

    /** @type {{ uid: number, entry: Record<string, unknown> } | null} */
    let fallback = null;

    for (const [uidKey, entry] of Object.entries(data.entries)) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const e = /** @type {Record<string, unknown>} */ (entry);
        if (e.automationId === MVU_WORLD_INFO_AUTOMATION_ID) {
            return { uid: Number(uidKey), entry: e };
        }
        if (isMvuVarsEntryComment(e.comment)) {
            fallback = { uid: Number(uidKey), entry: e };
        }
    }

    return fallback;
}

/**
 * @param {Record<string, unknown>} entry
 */
function applyMvuWorldInfoEntryFields(entry) {
    entry.comment = MVU_WORLD_INFO_ENTRY_COMMENT;
    entry.automationId = MVU_WORLD_INFO_AUTOMATION_ID;
    entry.constant = true;
    entry.selective = false;
    entry.position = world_info_position.after;
    entry.order = 100;
    entry.key = [];
    entry.keysecondary = [];
    entry.disable = false;
}

/**
 * @param {string} bookName
 * @param {object} data
 * @returns {{ uid: number, entry: Record<string, unknown> }}
 */
function ensureMvuWorldInfoEntry(bookName, data) {
    const binding = ensureChatBindingObject();
    const ref = binding.worldInfoRef;

    if (
        ref
        && ref.bookName === bookName
        && Number.isInteger(ref.entryUid)
        && data.entries?.[ref.entryUid]
    ) {
        const entry = /** @type {Record<string, unknown>} */ (data.entries[ref.entryUid]);
        applyMvuWorldInfoEntryFields(entry);
        return { uid: ref.entryUid, entry };
    }

    const found = findMvuVarsEntry(data);
    if (found) {
        applyMvuWorldInfoEntryFields(found.entry);
        binding.worldInfoRef = { bookName, entryUid: found.uid };
        return found;
    }

    const created = createWorldInfoEntry(bookName, data);
    if (!created) {
        throw new Error('[FloatingMVU] createWorldInfoEntry failed');
    }
    const entry = /** @type {Record<string, unknown>} */ (created);
    applyMvuWorldInfoEntryFields(entry);
    binding.worldInfoRef = { bookName, entryUid: created.uid };
    return { uid: created.uid, entry };
}

/**
 * @param {string | null} [bookNameOverride]
 */
export async function removeMvuWorldInfoEntry(bookNameOverride = null) {
    const binding = ensureChatBindingObject();
    const ref = binding.worldInfoRef;
    const bookName = bookNameOverride ?? ref?.bookName ?? null;

    if (!bookName) {
        delete binding.worldInfoRef;
        return;
    }

    const data = await loadWorldInfo(bookName);
    if (!data?.entries) {
        delete binding.worldInfoRef;
        await saveMetadata();
        return;
    }

    let uidToDelete = ref?.bookName === bookName ? ref.entryUid : undefined;
    if (!Number.isInteger(uidToDelete)) {
        uidToDelete = findMvuVarsEntry(data)?.uid;
    }

    if (Number.isInteger(uidToDelete) && data.entries[uidToDelete]) {
        delete data.entries[uidToDelete];
        await saveWorldInfo(bookName, data, true);
        floatingMvuDebugTrace('已移除世界书 MVU-VARS 条目', { bookName, entryUid: uidToDelete });
    }

    delete binding.worldInfoRef;
    await saveMetadata();
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 */
export async function syncMvuWorldInfoFromChat(preset) {
    if (!preset || !isPresetWorldInfoSyncEnabled(preset)) {
        await removeMvuWorldInfoEntry();
        return;
    }

    const bookName = resolveWorldBookNameForChat();
    if (!bookName) {
        if (!warnedNoWorldBook) {
            warnedNoWorldBook = true;
            floatingMvuDebugWarn(t('err.worldInfoNoBook'));
            if (typeof toastr !== 'undefined') {
                toastr.warning(t('err.worldInfoNoBook'));
            }
        }
        return;
    }
    warnedNoWorldBook = false;

    const data = await loadWorldInfo(bookName);
    if (!data) {
        floatingMvuDebugWarn('[FloatingMVU] loadWorldInfo failed', bookName);
        return;
    }

    const { entry } = ensureMvuWorldInfoEntry(bookName, data);
    const values = getChatVariableValues();
    entry.content = buildMvuWorldInfoContent(preset, values);

    await saveWorldInfo(bookName, data, true);
    await saveMetadata();
    reloadEditor(bookName);
    floatingMvuDebugTrace('世界书 MVU-VARS 已同步', {
        bookName,
        entryUid: bindingWorldInfoRefUid(),
        contentLength: String(entry.content ?? '').length,
    });
}

function bindingWorldInfoRefUid() {
    return ensureChatBindingObject().worldInfoRef?.entryUid;
}

/**
 * @param {import('./schema.js').MvuPreset | null | undefined} [preset]
 */
export function scheduleWorldInfoSync(preset) {
    if (!getSettings().enabled) {
        return;
    }
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(() => {
        syncDebounceTimer = null;
        const activePreset = preset ?? null;
        if (!activePreset) {
            return;
        }
        void syncMvuWorldInfoFromChat(activePreset).catch(err => {
            floatingMvuDebugWarn('世界书同步失败', err);
        });
    }, 300);
}

/**
 * @param {import('./schema.js').MvuPreset | null | undefined} [preset]
 */
export async function syncMvuWorldInfoFromChatImmediate(preset) {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }
    if (!preset) {
        return;
    }
    await syncMvuWorldInfoFromChat(preset);
}
