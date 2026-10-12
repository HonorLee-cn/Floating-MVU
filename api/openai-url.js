/**
 * @param {string} baseUrl
 * @returns {string}
 */
export function normalizeOpenAiBaseUrl(baseUrl) {
    return String(baseUrl ?? '').trim().replace(/\/+$/, '');
}

/**
 * @param {string} baseUrl
 * @returns {string}
 */
export function normalizeChatCompletionsUrl(baseUrl) {
    let url = normalizeOpenAiBaseUrl(baseUrl);
    if (!url) {
        return '';
    }
    if (/\/chat\/completions$/i.test(url)) {
        return url;
    }
    if (/\/v\d+$/i.test(url)) {
        return `${url}/chat/completions`;
    }
    return `${url}/v1/chat/completions`;
}

/**
 * @param {string} baseUrl
 * @returns {string}
 */
export function normalizeModelsUrl(baseUrl) {
    let url = normalizeOpenAiBaseUrl(baseUrl);
    if (!url) {
        return '';
    }
    if (/\/models$/i.test(url)) {
        return url;
    }
    if (/\/chat\/completions$/i.test(url)) {
        return url.replace(/\/chat\/completions$/i, '/models');
    }
    if (/\/v\d+$/i.test(url)) {
        return `${url}/models`;
    }
    return `${url}/v1/models`;
}
