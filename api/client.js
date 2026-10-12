import { getRequestHeaders } from '../../../../../script.js';
import { floatingMvuDebugTrace } from '../debug-log.js';
import { t } from '../i18n/index.js';
import { normalizeModelsUrl } from './openai-url.js';

/**
 * @param {unknown} data
 * @returns {string[]}
 */
function parseModelsResponse(data) {
    if (!data) {
        return [];
    }
    if (Array.isArray(data)) {
        return data
            .map(item => (typeof item === 'string' ? item : item?.id))
            .filter(id => typeof id === 'string' && id.length);
    }
    if (typeof data === 'object') {
        const obj = /** @type {Record<string, unknown>} */ (data);
        if (Array.isArray(obj.data)) {
            return parseModelsResponse(obj.data);
        }
        if (Array.isArray(obj.models)) {
            return parseModelsResponse(obj.models);
        }
    }
    return [];
}

/**
 * @param {import('../settings.js').FloatingMvuCustomApiSettings} customApi
 * @returns {Promise<string[]>}
 */
export async function fetchModelList(customApi) {
    const baseUrl = String(customApi?.baseUrl ?? '').trim();
    if (!baseUrl) {
        throw new Error(t('err.noBaseUrl'));
    }

    const url = normalizeModelsUrl(baseUrl);
    const headers = {
        ...getRequestHeaders(),
        'Content-Type': 'application/json',
    };
    const apiKey = String(customApi?.apiKey ?? '').trim();
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    floatingMvuDebugTrace('拉取模型列表', { url });

    const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-cache',
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const detail = payload && typeof payload === 'object' && 'error' in payload
            ? JSON.stringify(/** @type {{ error?: unknown }} */ (payload).error)
            : response.statusText;
        throw new Error(t('err.http', { status: response.status, detail: detail || t('err.httpFallback') }));
    }

    const models = parseModelsResponse(payload);
    const unique = [...new Set(models.map(id => id.trim()).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (!unique.length) {
        throw new Error(t('err.noModels'));
    }

    return unique;
}

export async function complete() {
    floatingMvuDebugTrace('custom API complete is not implemented yet.');
    throw new Error('FloatingMVU custom API complete() 请使用 mvu-update-api 调用');
}
