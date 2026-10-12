import { t } from '../i18n/index.js';
import { getSettings, saveSettings } from '../settings.js';
import { createPreset, ensurePresetShape } from './schema.js';
import { clearChatPresetIfMatches } from './chat-preset.js';

/**
 * @returns {import('./schema.js').MvuPreset[]}
 */
export function listPresets() {
    const settings = getSettings();
    if (!Array.isArray(settings.presets)) {
        settings.presets = [];
    }
    return settings.presets.map(p => ensurePresetShape(p));
}

/**
 * @param {string} id
 * @returns {import('./schema.js').MvuPreset | null}
 */
export function getPresetById(id) {
    if (!id) {
        return null;
    }
    return listPresets().find(p => p.id === id) ?? null;
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @returns {import('./schema.js').MvuPreset}
 */
export function upsertPreset(preset) {
    const settings = getSettings();
    if (!Array.isArray(settings.presets)) {
        settings.presets = [];
    }
    const normalized = ensurePresetShape(structuredClone(preset));
    normalized.updatedAt = Date.now();
    const index = settings.presets.findIndex(p => p.id === normalized.id);
    if (index >= 0) {
        settings.presets[index] = normalized;
    } else {
        settings.presets.push(normalized);
    }
    settings.presets.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    saveSettings();
    return normalized;
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function deletePreset(id) {
    const settings = getSettings();
    if (!Array.isArray(settings.presets)) {
        return false;
    }
    const before = settings.presets.length;
    settings.presets = settings.presets.filter(p => p.id !== id);
    if (settings.presets.length === before) {
        return false;
    }
    clearChatPresetIfMatches(id);
    saveSettings();
    return true;
}

/**
 * @returns {import('./schema.js').MvuPreset}
 */
export function createDraftPreset() {
    return createPreset({ name: t('defaults.newPreset') });
}
