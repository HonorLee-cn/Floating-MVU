/**
 * Floating MVU — SillyTavern extension
 * Copyright (C) 2026 HonorLee
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 * See LICENSE in this directory for the full GNU GPL v3 text.
 */
import { chat, eventSource, event_types } from '../../../../script.js';
import { isActiveChatContext } from './chat-context.js';
import { floatingMvuDebugTrace } from './debug-log.js';
import { getBoundPresetForChat } from './mvu/chat-preset.js';
import { registerMvuQuietGenerationHooks } from './mvu/mvu-st-generate.js';
import { runMvuPanelRefresh } from './mvu/mvu-refresh.js';
import {
    onMvuChatMessagesDeleted,
    onMvuMessageSwiped,
} from './mvu/variable-history.js';
import { refreshPanelView } from './ui/panel-views.js';
import { isPresetAutoUpdateOnMessageReceived } from './mvu/schema.js';
import { getSettings, registerExtensionSettingsUi } from './settings.js';
import { applyActiveTheme } from './theme/apply-theme.js';
import { ensurePackThemes } from './theme/pack-themes.js';
import { refreshCandidateList, setCandidatesUiHiddenUntilNextUpdate } from './ui/candidate-list.js';
import { syncFloatingMvuUi } from './ui/dom.js';
import { clampAllFloatingMvuElements, registerViewportListeners } from './ui/viewport.js';

export const MODULE_NAME = 'FloatingMVU';

function onContextChange() {
    syncFloatingMvuUi();
}

function onChatRemoved() {
    syncFloatingMvuUi();
}

/**
 * @param {number} messageId
 * @param {string} [type]
 */
function onMessageReceived(messageId, type) {
    if (!getSettings().enabled || !isActiveChatContext()) {
        return;
    }

    const preset = getBoundPresetForChat();
    if (!preset || !isPresetAutoUpdateOnMessageReceived(preset)) {
        return;
    }

    if (type === 'impersonate' || type === 'first_message') {
        return;
    }

    const index = Number(messageId);
    if (!Number.isFinite(index) || index < 0 || index >= chat.length) {
        return;
    }

    const message = chat[index];
    if (!message || message.is_user || message.is_system || !String(message.mes ?? '').trim()) {
        return;
    }

    floatingMvuDebugTrace('收到角色消息，触发 MVU 自动更新', { messageId: index, type });
    void runMvuPanelRefresh({ anchorMessageIndex: index });
}

/**
 * @param {number} newChatLength
 */
async function onMessageDeleted(newChatLength) {
    if (!getSettings().enabled || !isActiveChatContext() || !getBoundPresetForChat()) {
        return;
    }
    await onMvuChatMessagesDeleted(newChatLength);
    setCandidatesUiHiddenUntilNextUpdate(false);
    refreshPanelView();
    refreshCandidateList();
}

/**
 * @param {number} mesId
 */
async function onMessageSwiped(mesId) {
    if (!getSettings().enabled || !isActiveChatContext() || !getBoundPresetForChat()) {
        return;
    }
    await onMvuMessageSwiped(mesId);
    setCandidatesUiHiddenUntilNextUpdate(false);
    refreshPanelView();
    refreshCandidateList();
}

function onMessageSent() {
    if (!getSettings().enabled || !isActiveChatContext() || !getBoundPresetForChat()) {
        return;
    }
    setCandidatesUiHiddenUntilNextUpdate(true);
}

/** Extension activate hook (see manifest.json). */
export async function init() {
    getSettings();
    registerMvuQuietGenerationHooks();
    ensurePackThemes();
    applyActiveTheme();
    registerViewportListeners(() => {
        syncFloatingMvuUi();
        clampAllFloatingMvuElements();
    });

    eventSource.on(event_types.APP_READY, onContextChange);
    eventSource.on(event_types.CHAT_CHANGED, onContextChange);
    eventSource.on(event_types.CHAT_LOADED, onContextChange);
    eventSource.on(event_types.CHAT_DELETED, onChatRemoved);
    eventSource.on(event_types.GROUP_CHAT_DELETED, onChatRemoved);
    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
    eventSource.on(event_types.MESSAGE_DELETED, onMessageDeleted);
    eventSource.on(event_types.MESSAGE_SWIPED, onMessageSwiped);
    eventSource.on(event_types.MESSAGE_SENT, onMessageSent);

    await registerExtensionSettingsUi(syncFloatingMvuUi);
    onContextChange();

    floatingMvuDebugTrace(`${MODULE_NAME} extension activated`);
}
