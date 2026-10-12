import { getSettings } from '../settings.js';
import { FMVU_MESSAGES } from './messages.js';

/** @typedef {import('./messages.js').FloatingMvuLocale} FloatingMvuLocale */

/**
 * @returns {FloatingMvuLocale}
 */
export function getFloatingMvuLocale() {
    const locale = getSettings().locale;
    return locale === 'en' ? 'en' : 'zh';
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
    const locale = getFloatingMvuLocale();
    let text = FMVU_MESSAGES[locale][key] ?? FMVU_MESSAGES.zh[key] ?? key;
    for (const [name, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
    return text;
}

/**
 * @param {JQuery<HTMLElement>} [$root]
 */
export function applySettingsPanelI18n($root) {
    const $scope = $root?.length ? $root : $('#floating_mvu_container');
    if (!$scope.length) {
        return;
    }

    $scope.find('[data-fmvu-i18n]').each((_i, el) => {
        const key = el.getAttribute('data-fmvu-i18n');
        if (key) {
            $(el).text(t(key));
        }
    });

    $scope.find('[data-fmvu-i18n-placeholder]').each((_i, el) => {
        const key = el.getAttribute('data-fmvu-i18n-placeholder');
        if (key && 'placeholder' in el) {
            el.placeholder = t(key);
        }
    });

    $scope.find('[data-fmvu-i18n-title]').each((_i, el) => {
        const key = el.getAttribute('data-fmvu-i18n-title');
        if (key) {
            el.setAttribute('title', t(key));
        }
    });

    const locale = getFloatingMvuLocale();
    $scope.find('#floating_mvu_locale').val(locale);
}

/**
 * 更新浮动面板头部按钮等静态 DOM 文案。
 */
/**
 * @param {string} tokenKey
 * @returns {string}
 */
export function themeTokenLabel(tokenKey) {
    return t(`theme.token.${tokenKey}`);
}

export function applyPanelChromeI18n() {
    const $fab = $('#floating_mvu_fab');
    if ($fab.length) {
        const fabTitle = t('panel.fabTitle');
        $fab.attr('title', fabTitle).attr('aria-label', fabTitle);
    }

    const map = [
        ['.floating-mvu-refresh-btn', 'panel.refresh', 'aria-label'],
        ['.floating-mvu-theme-btn', 'panel.theme', 'aria-label'],
        ['.floating-mvu-settings-btn', 'panel.settings', 'aria-label'],
        ['.floating-mvu-collapse-btn', 'panel.collapse', 'aria-label'],
        ['.floating-mvu-panel-resize-handle', 'panel.resize', 'title'],
    ];
    for (const [selector, key, attr] of map) {
        $(`#floating_mvu_panel ${selector}`).each((_i, el) => {
            el.setAttribute(attr, t(key));
            if (attr === 'aria-label') {
                el.setAttribute('title', t(key));
            }
        });
    }
}
