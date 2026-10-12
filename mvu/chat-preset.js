import { chat_metadata, saveMetadata } from '../../../../../script.js';
import { getPresetById } from './preset-store.js';

const METADATA_KEY = 'floating_mvu';

/**
 * @returns {{ presetId: string | null, themeId: string | null }}
 */
function ensureChatBindingObject() {
    if (!chat_metadata[METADATA_KEY] || typeof chat_metadata[METADATA_KEY] !== 'object') {
        chat_metadata[METADATA_KEY] = { presetId: null, themeId: null, values: {}, snapshots: [] };
    }
    if (chat_metadata[METADATA_KEY].presetId === undefined) {
        chat_metadata[METADATA_KEY].presetId = null;
    }
    if (chat_metadata[METADATA_KEY].themeId === undefined) {
        chat_metadata[METADATA_KEY].themeId = null;
    }
    if (!chat_metadata[METADATA_KEY].values || typeof chat_metadata[METADATA_KEY].values !== 'object') {
        chat_metadata[METADATA_KEY].values = {};
    }
    if (!Array.isArray(chat_metadata[METADATA_KEY].snapshots)) {
        chat_metadata[METADATA_KEY].snapshots = [];
    }
    return chat_metadata[METADATA_KEY];
}

export { ensureChatBindingObject };

/**
 * @returns {string | null}
 */
export function getChatPresetId() {
    const binding = chat_metadata[METADATA_KEY];
    if (!binding || typeof binding !== 'object') {
        return null;
    }
    const id = binding.presetId;
    return typeof id === 'string' && id.length ? id : null;
}

/**
 * @param {string | null} presetId
 */
export async function setChatPresetId(presetId) {
    const binding = ensureChatBindingObject();
    binding.presetId = presetId;
    await saveMetadata();
}

/**
 * @param {string} presetId
 */
export async function clearChatPresetIfMatches(presetId) {
    if (getChatPresetId() === presetId) {
        await setChatPresetId(null);
    }
}

/**
 * @returns {import('./schema.js').MvuPreset | null}
 */
export function getBoundPresetForChat() {
    const id = getChatPresetId();
    if (!id) {
        return null;
    }
    const preset = getPresetById(id);
    return preset ?? null;
}

/**
 * @returns {boolean}
 */
export function isChatPresetConfigured() {
    return getBoundPresetForChat() !== null;
}

/**
 * @returns {string | null}
 */
export function getChatThemeId() {
    const binding = chat_metadata[METADATA_KEY];
    if (!binding || typeof binding !== 'object') {
        return null;
    }
    const id = binding.themeId;
    return typeof id === 'string' && id.length ? id : null;
}

/**
 * @param {string | null} themeId
 */
export async function setChatThemeId(themeId) {
    const binding = ensureChatBindingObject();
    binding.themeId = themeId;
    await saveMetadata();
}

/**
 * @param {string} themeId
 */
export async function clearChatThemeIfMatches(themeId) {
    if (getChatThemeId() === themeId) {
        await setChatThemeId(null);
    }
}
