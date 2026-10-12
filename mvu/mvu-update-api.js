import {
    extractMessageFromData,
    generateRawData,
    getRequestHeaders,
    main_api,
} from '../../../../../script.js';
import { normalizeChatCompletionsUrl } from '../api/openai-url.js';
import { t } from '../i18n/index.js';
import { getSettings } from '../settings.js';
import { buildMvuUpdateRequestLogPayload } from './mvu-update-request.js';

/**
 * @param {import('./mvu-update-request.js').MvuUpdateRequest} request
 */
function buildOpenAiChatBody(request, model) {
    return {
        model,
        stream: false,
        messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
        ],
    };
}

/**
 * @param {unknown} data
 * @returns {string}
 */
function extractOpenAiAssistantText(data) {
    if (!data || typeof data !== 'object') {
        return '';
    }
    const choices = /** @type {{ choices?: { message?: { content?: string } }[] }} */ (data).choices;
    const content = choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : '';
}

/**
 * @typedef {object} MvuUpdateApiResult
 * @property {'custom' | 'sillytavern'} provider
 * @property {unknown} rawResponse
 * @property {string} assistantText
 * @property {object} requestLog
 */

/**
 * @param {import('./mvu-update-request.js').MvuUpdateRequest} request
 * @returns {object}
 */
export function buildMvuUpdateRequestLogForCurrentSettings(request) {
    const settings = getSettings();
    const custom = settings.customApi;

    if (custom?.enabled && String(custom.baseUrl ?? '').trim()) {
        const url = normalizeChatCompletionsUrl(custom.baseUrl);
        const model = String(custom.model ?? '').trim();
        const body = model ? buildOpenAiChatBody(request, model) : null;
        return buildMvuUpdateRequestLogPayload(request, 'custom', {
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(custom.apiKey ? { Authorization: 'Bearer ***' } : {}),
            },
            body,
            model,
        });
    }

    return buildMvuUpdateRequestLogPayload(request, 'sillytavern', {
        api: main_api,
        generateRawParams: {
            api: main_api,
            stream: false,
            systemPrompt: request.systemPrompt,
            prompt: request.userPrompt,
            trimNames: true,
        },
    });
}

/**
 * @param {import('./mvu-update-request.js').MvuUpdateRequest} request
 * @returns {Promise<MvuUpdateApiResult>}
 */
export async function callMvuUpdateApi(request) {
    const settings = getSettings();
    const custom = settings.customApi;

    if (custom?.enabled && String(custom.baseUrl ?? '').trim()) {
        const url = normalizeChatCompletionsUrl(custom.baseUrl);
        const model = String(custom.model ?? '').trim();
        if (!model) {
            throw new Error(`[FloatingMVU] ${t('err.customNoModel')}`);
        }
        const body = buildOpenAiChatBody(request, model);
        const requestLog = buildMvuUpdateRequestLogPayload(request, 'custom', {
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(custom.apiKey ? { Authorization: 'Bearer ***' } : {}),
            },
            body,
        });

        const headers = {
            'Content-Type': 'application/json',
            ...getRequestHeaders(),
        };
        if (custom.apiKey) {
            headers.Authorization = `Bearer ${custom.apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            cache: 'no-cache',
            body: JSON.stringify(body),
        });

        const rawResponse = await response.json().catch(async () => {
            const text = await response.text();
            return { _nonJsonBody: text, status: response.status };
        });

        if (!response.ok) {
            const err = new Error(`[FloatingMVU] ${t('err.customHttp', { status: response.status })}`);
            /** @type {Error & { response?: unknown }} */ (err).response = rawResponse;
            throw err;
        }

        const assistantText = extractOpenAiAssistantText(rawResponse);
        return { provider: 'custom', rawResponse, assistantText, requestLog };
    }

    const requestLog = buildMvuUpdateRequestLogPayload(request, 'sillytavern', {
        api: main_api,
        generateRawParams: {
            api: main_api,
            stream: false,
            systemPrompt: request.systemPrompt,
            prompt: request.userPrompt,
            trimNames: true,
        },
    });

    const rawResponse = await generateRawData({
        systemPrompt: request.systemPrompt,
        prompt: request.userPrompt,
    });

    const assistantText = extractMessageFromData(rawResponse, main_api);

    return {
        provider: 'sillytavern',
        rawResponse,
        assistantText,
        requestLog,
    };
}
