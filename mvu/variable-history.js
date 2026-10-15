import { chat, saveMetadata } from '../../../../../script.js';
import { floatingMvuDebugTrace } from '../debug-log.js';
import { ensureChatBindingObject, getBoundPresetForChat } from './chat-preset.js';
import { scheduleWorldInfoSync } from './world-info-sync.js';

/** @typedef {Record<string, string | number>} MvuChatVariableValues */
/** @typedef {import('./schema.js').MvuCandidateItem} MvuCandidateItem */

/**
 * @typedef {object} MvuValueSnapshot
 * @property {number} anchorIndex 触发更新时的角色消息索引（对话层）
 * @property {number} chatLength 写入快照时的 chat.length
 * @property {string} pathKey 截至 anchorIndex 的分支路径（含各层 swipe_id）
 * @property {MvuChatVariableValues} values
 * @property {MvuCandidateItem[]} [candidates]
 * @property {number} at
 */

/**
 * @param {number} endIndexInclusive
 * @returns {string}
 */
export function buildChatPathKeyUpToIndex(endIndexInclusive) {
    if (!chat.length || endIndexInclusive < 0) {
        return '';
    }
    const end = Math.min(endIndexInclusive, chat.length - 1);
    /** @type {string[]} */
    const parts = [];
    for (let i = 0; i <= end; i++) {
        const swipeId = chat[i]?.swipe_id;
        parts.push(`${i}:${Number.isFinite(swipeId) ? swipeId : 0}`);
    }
    return parts.join('|');
}

/**
 * @param {MvuValueSnapshot} snapshot
 * @returns {boolean}
 */
function snapshotMatchesCurrentChatPath(snapshot) {
    if (snapshot.anchorIndex < 0 || snapshot.anchorIndex >= chat.length) {
        return false;
    }
    return snapshot.pathKey === buildChatPathKeyUpToIndex(snapshot.anchorIndex);
}

/**
 * @returns {MvuValueSnapshot[]}
 */
function getSnapshotList() {
    const binding = ensureChatBindingObject();
    if (!Array.isArray(binding.snapshots)) {
        binding.snapshots = [];
    }
    return binding.snapshots;
}

/**
 * @returns {MvuValueSnapshot | null}
 */
function findBestSnapshotForCurrentChat() {
    const snapshots = getSnapshotList();
    /** @type {MvuValueSnapshot | null} */
    let best = null;

    for (const snapshot of snapshots) {
        if (!snapshotMatchesCurrentChatPath(snapshot)) {
            continue;
        }
        if (!best || snapshot.anchorIndex > best.anchorIndex) {
            best = snapshot;
        }
    }

    return best;
}

/**
 * @returns {MvuChatVariableValues}
 */
export function findBestSnapshotValuesForCurrentChat() {
    const binding = ensureChatBindingObject();
    const best = findBestSnapshotForCurrentChat();

    if (best?.values && typeof best.values === 'object') {
        return { ...best.values };
    }

    if (binding.values && typeof binding.values === 'object' && Object.keys(binding.values).length) {
        return { ...binding.values };
    }

    return {};
}

/**
 * @returns {MvuCandidateItem[]}
 */
export function findBestSnapshotCandidatesForCurrentChat() {
    const binding = ensureChatBindingObject();
    const best = findBestSnapshotForCurrentChat();

    if (best && Array.isArray(best.candidates)) {
        return best.candidates.map(c => ({ ...c }));
    }

    if (Array.isArray(binding.candidates)) {
        return binding.candidates.map(c => ({ ...c }));
    }

    return [];
}

/**
 * 将 binding.values / candidates 同步为当前时间线对应快照（删消息 / 切分支 / 加载聊天后调用）。
 */
export async function syncMvuValuesToCurrentTimeline(reason = 'timeline') {
    const binding = ensureChatBindingObject();
    const snapshots = getSnapshotList();
    const maxAllowedAnchor = Math.max(0, chat.length - 1);
    binding.snapshots = snapshots.filter(s => s.anchorIndex <= maxAllowedAnchor);

    const resolved = findBestSnapshotValuesForCurrentChat();
    binding.values = resolved;
    binding.candidates = findBestSnapshotCandidatesForCurrentChat();
    await saveMetadata();
    floatingMvuDebugTrace('MVU 变量已按时间线同步', {
        reason,
        chatLength: chat.length,
        keys: Object.keys(resolved),
        candidateCount: binding.candidates.length,
    });

    const preset = getBoundPresetForChat();
    if (preset) {
        scheduleWorldInfoSync(preset);
    }
}

/**
 * @returns {number}
 */
export function getDefaultMvuAnchorMessageIndex() {
    if (!chat.length) {
        return -1;
    }
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message || message.is_system) {
            continue;
        }
        if (!message.is_user && String(message.mes ?? '').trim()) {
            return i;
        }
    }
    return chat.length - 1;
}

/**
 * @param {number} anchorIndex
 * @param {MvuChatVariableValues} values
 * @param {MvuCandidateItem[] | null | undefined} [candidates]
 */
export async function recordMvuSnapshotAtAnchor(anchorIndex, values, candidates) {
    if (anchorIndex < 0 || !chat.length) {
        return;
    }

    const binding = ensureChatBindingObject();
    const snapshots = getSnapshotList();
    const pathKey = buildChatPathKeyUpToIndex(anchorIndex);
    const chatLength = chat.length;
    const payload = { ...values };

    binding.snapshots = snapshots.filter(s => s.anchorIndex < anchorIndex);

    /** @type {MvuValueSnapshot} */
    const entry = {
        anchorIndex,
        chatLength,
        pathKey,
        values: payload,
        at: Date.now(),
    };

    if (candidates !== undefined) {
        entry.candidates = Array.isArray(candidates) ? candidates.map(c => ({ ...c })) : [];
    } else {
        const prev = snapshots.find(s => s.anchorIndex === anchorIndex && s.pathKey === pathKey);
        if (prev && Array.isArray(prev.candidates)) {
            entry.candidates = prev.candidates.map(c => ({ ...c }));
        } else if (Array.isArray(binding.candidates)) {
            entry.candidates = binding.candidates.map(c => ({ ...c }));
        } else {
            entry.candidates = [];
        }
    }

    binding.snapshots.push(entry);
    binding.snapshots.sort((a, b) => a.anchorIndex - b.anchorIndex || a.at - b.at);
    binding.values = { ...payload };
    binding.candidates = entry.candidates ?? [];

    await saveMetadata();
    floatingMvuDebugTrace('MVU 快照已记录', { anchorIndex, chatLength, pathKey, candidateCount: binding.candidates.length });
}

/**
 * 删除尾部消息后：丢弃无效快照并恢复变量。
 * @param {number} newChatLength MESSAGE_DELETED 事件传入的 chat.length
 */
export async function onMvuChatMessagesDeleted(newChatLength) {
    const binding = ensureChatBindingObject();
    const limit = Math.max(0, Number(newChatLength) || 0);
    binding.snapshots = getSnapshotList().filter(s => s.anchorIndex < limit);
    await syncMvuValuesToCurrentTimeline('message_deleted');
}

/**
 * 切换 swipe 分支后：丢弃锚点之后的快照并恢复仍匹配路径的变量。
 * @param {number} mesId
 */
export async function onMvuMessageSwiped(mesId) {
    const index = Number(mesId);
    if (!Number.isFinite(index) || index < 0) {
        await syncMvuValuesToCurrentTimeline('message_swiped');
        return;
    }
    const binding = ensureChatBindingObject();
    binding.snapshots = getSnapshotList().filter(s => s.anchorIndex <= index && snapshotMatchesCurrentChatPath(s));
    await syncMvuValuesToCurrentTimeline('message_swiped');
}
