import {
    getRequestHeaders,
    main_api,
} from '../../../../../script.js';
import { normalizeChatCompletionsUrl } from '../api/openai-url.js';
import { t } from '../i18n/index.js';
import { getSettings } from '../settings.js';
import { floatingMvuDebugTrace } from '../debug-log.js';
import { extractMvuAssistantText } from './extract-mvu-assistant-text.js';
import { generateRawDataForMvuViaSillyTavern } from './mvu-st-generate.js';
import { buildMvuUpdateRequestLogPayload } from './mvu-update-request.js';

const MVU_MAX_GENERATION_ATTEMPTS = 4;
const MVU_QUIET_TEMP_BY_ATTEMPT = [0.42, 0.32, 0.22, 0.15];
const MVU_QUIET_MIN_TOKENS = 48;

/**
 * @param {import('./mvu-update-request.js').MvuUpdateRequest} request
 * @param {string} model
 * @param {number} attemptIndex
 */
function buildOpenAiChatBody(request, model, attemptIndex = 0) {
    const temp = MVU_QUIET_TEMP_BY_ATTEMPT[
        Math.min(Math.max(0, attemptIndex), MVU_QUIET_TEMP_BY_ATTEMPT.length - 1)
    ];
    return {
        model,
        stream: false,
        temperature: temp,
        min_tokens: MVU_QUIET_MIN_TOKENS,
        messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
        ],
        reasoning_in_content: true,
        reasoning_format: 'none',
        reasoning_budget_tokens: 0,
        include_reasoning: false,
    };
}

/**
 * @param {string} text
 */
function hasMvuAssistantText(text) {
    return Boolean(String(text ?? '').trim());
}

/**
 * @typedef {object} MvuUpdateApiResult
 * @property {'custom' | 'sillytavern'} provider
 * @property {unknown} rawResponse
 * @property {string} assistantText
 * @property {import('./extract-mvu-assistant-text.js').MvuAssistantExtractMeta} [assistantTextMeta]
 * @property {object} requestLog
 * @property {number} [attemptCount]
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
        const body = model ? buildOpenAiChatBody(request, model, 0) : null;
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
            instructOverride: true,
            promptRole: 'system',
            combinedPrompt: [request.systemPrompt, request.userPrompt].filter(Boolean).join('\n\n'),
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

        const headers = {
            'Content-Type': 'application/json',
            ...getRequestHeaders(),
        };
        if (custom.apiKey) {
            headers.Authorization = `Bearer ${custom.apiKey}`;
        }

        /** @type {unknown} */
        let rawResponse = null;
        /** @type {ReturnType<typeof extractMvuAssistantText>} */
        let extracted = { text: '', usedFallback: false, sources: [] };
        let attemptCount = 0;

        for (let attemptIndex = 0; attemptIndex < MVU_MAX_GENERATION_ATTEMPTS; attemptIndex++) {
            attemptCount = attemptIndex + 1;
            const body = buildOpenAiChatBody(request, model, attemptIndex);
            const requestLog = buildMvuUpdateRequestLogPayload(request, 'custom', {
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(custom.apiKey ? { Authorization: 'Bearer ***' } : {}),
                },
                body,
            });

            const response = await fetch(url, {
                method: 'POST',
                headers,
                cache: 'no-cache',
                body: JSON.stringify(body),
            });

            rawResponse = await response.json().catch(async () => {
                const text = await response.text();
                return { _nonJsonBody: text, status: response.status };
            });

            if (!response.ok) {
                const err = new Error(`[FloatingMVU] ${t('err.customHttp', { status: response.status })}`);
                /** @type {Error & { response?: unknown }} */ (err).response = rawResponse;
                throw err;
            }

            extracted = extractMvuAssistantText(rawResponse, 'openai');
            if (hasMvuAssistantText(extracted.text)) {
                return {
                    provider: 'custom',
                    rawResponse,
                    assistantText: extracted.text,
                    assistantTextMeta: extracted,
                    requestLog,
                    attemptCount,
                };
            }

            floatingMvuDebugTrace(`MVU 自定义 API 第 ${attemptCount} 次无正文`, {
                tokens_predicted: /** @type {Record<string, unknown>} */ (rawResponse)?.tokens_predicted,
                stop_type: /** @type {Record<string, unknown>} */ (rawResponse)?.stop_type,
            });
        }

        return {
            provider: 'custom',
            rawResponse,
            assistantText: extracted.text,
            assistantTextMeta: extracted,
            requestLog: buildMvuUpdateRequestLogPayload(request, 'custom', { url, model }),
            attemptCount,
        };
    }

    const requestLog = buildMvuUpdateRequestLogPayload(request, 'sillytavern', {
        api: main_api,
        generateRawParams: {
            api: main_api,
            stream: false,
            instructOverride: true,
            promptRole: 'system',
            combinedPrompt: [request.systemPrompt, request.userPrompt].filter(Boolean).join('\n\n'),
        },
    });

    /** @type {unknown} */
    let rawResponse = null;
    /** @type {ReturnType<typeof extractMvuAssistantText>} */
    let extracted = { text: '', usedFallback: false, sources: [] };
    let attemptCount = 0;

    for (let attemptIndex = 0; attemptIndex < MVU_MAX_GENERATION_ATTEMPTS; attemptIndex++) {
        attemptCount = attemptIndex + 1;
        rawResponse = await generateRawDataForMvuViaSillyTavern(request, { attemptIndex });
        extracted = extractMvuAssistantText(rawResponse, main_api);

        if (hasMvuAssistantText(extracted.text)) {
            break;
        }

        floatingMvuDebugTrace(`MVU ST 第 ${attemptCount} 次无正文`, {
            tokens_predicted: /** @type {Record<string, unknown>} */ (rawResponse)?.tokens_predicted,
            stop_type: /** @type {Record<string, unknown>} */ (rawResponse)?.stop_type,
            generation_settings: /** @type {Record<string, unknown>} */ (rawResponse)?.generation_settings,
        });
    }

    return {
        provider: 'sillytavern',
        rawResponse,
        assistantText: extracted.text,
        assistantTextMeta: extracted,
        requestLog,
        attemptCount,
    };
}
