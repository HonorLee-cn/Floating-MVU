import { chat } from '../../../../../script.js';
import { t } from '../i18n/index.js';
import { buildMvuCharacterContextBlock } from './character-context.js';
import {
    buildMvuDialoguePrompt,
    getMvuPromptFormatFooter,
    MVU_PROMPT_SECTION_SEPARATOR,
} from './dialogue-prompt.js';

export function getMvuUpdateSystemPrompt() {
    return t('prompt.system');
}

export const DEFAULT_MVU_CONTEXT_MESSAGE_COUNT = 5;

/**
 * @param {number} [maxMessages]
 * @returns {{ lines: string[], messageCount: number }}
 */
export function formatRecentChatForMvu(maxMessages = DEFAULT_MVU_CONTEXT_MESSAGE_COUNT) {
    const limit = Math.max(1, Math.min(20, Math.floor(maxMessages)));
    /** @type {string[]} */
    const lines = [];

    for (let i = chat.length - 1; i >= 0 && lines.length < limit; i--) {
        const message = chat[i];
        if (!message || message.is_system || !message.mes) {
            continue;
        }
        const name = String(message.name ?? '').trim() || t('prompt.unknownSpeaker');
        lines.unshift(`${name}:\n${String(message.mes).trim()}`);
    }

    return { lines, messageCount: lines.length };
}

/**
 * @typedef {object} MvuUpdateRequest
 * @property {string} systemPrompt
 * @property {string} userPrompt
 * @property {boolean} stream
 * @property {number} contextMessageCount
 * @property {string} characterContextBlock
 * @property {string} mvuDialogueBlock
 * @property {string} recentDialogueBlock
 * @property {string} formatFooterBlock
 */

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @param {object} [options]
 * @param {Record<string, string | number>} [options.currentValues]
 * @param {number} [options.maxContextMessages]
 * @returns {MvuUpdateRequest}
 */
export function buildMvuUpdateRequest(preset, options = {}) {
    const currentValues = options.currentValues ?? {};
    const maxContextMessages = options.maxContextMessages ?? DEFAULT_MVU_CONTEXT_MESSAGE_COUNT;
    const { block: characterContextBlock } = buildMvuCharacterContextBlock();
    const mvuDialogueBlock = buildMvuDialoguePrompt(preset, currentValues);
    const { lines, messageCount } = formatRecentChatForMvu(maxContextMessages);
    const recentDialogueBlock = lines.length ? lines.join('\n\n') : t('prompt.noChat');
    const formatFooterBlock = getMvuPromptFormatFooter();

    const userPrompt = [
        characterContextBlock,
        '',
        t('prompt.section.recentChat'),
        recentDialogueBlock,
        '',
        MVU_PROMPT_SECTION_SEPARATOR,
        '',
        mvuDialogueBlock,
        '',
        formatFooterBlock,
    ].join('\n').trim();

    return {
        systemPrompt: getMvuUpdateSystemPrompt(),
        userPrompt,
        stream: false,
        contextMessageCount: messageCount,
        characterContextBlock,
        mvuDialogueBlock,
        recentDialogueBlock,
        formatFooterBlock,
    };
}

/**
 * @param {MvuUpdateRequest} request
 * @param {'custom' | 'sillytavern'} provider
 * @param {object} [extra]
 */
export function buildMvuUpdateRequestLogPayload(request, provider, extra = {}) {
    return {
        provider,
        stream: request.stream,
        contextMessageCount: request.contextMessageCount,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        ...extra,
    };
}
