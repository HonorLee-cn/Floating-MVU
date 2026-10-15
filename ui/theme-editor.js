import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../popup.js';
import { escapeHtml } from '../../../../utils.js';
import { t, themeTokenLabel } from '../i18n/index.js';
import { applyThemeLive, clearThemePreviewOverride } from '../theme/apply-theme.js';
import {
    DEFAULT_THEME_ID,
    MVU_PANEL_BG_IMAGE_OPACITY_VAR,
    MVU_PANEL_BG_IMAGE_VAR,
    MVU_THEME_TOKEN_DEFS,
    formatPanelBgImageOpacity,
    panelBgImageUrlToCss,
    parsePanelBgImageOpacity,
    parsePanelBgImageUrl,
} from '../theme/tokens.js';
import { resolveTheme, setActiveThemeId, upsertCustomTheme } from '../theme/theme-store.js';
import { toColorInputValue } from './color-utils.js';

/**
 * @param {string} themeId
 */
export async function openThemeEditor(themeId) {
    if (themeId === DEFAULT_THEME_ID) {
        return;
    }

    const resolved = resolveTheme(themeId);
    const initialSnapshot = {
        id: themeId,
        vars: { ...resolved.vars },
        customCss: resolved.customCss,
    };
    await setActiveThemeId(themeId);
    applyThemeLive(themeId, resolved.vars, resolved.customCss);

    /** @type {Record<string, string>} */
    const draftVars = { ...resolved.vars };
    let draftCss = resolved.customCss;
    let draftName = resolved.name;

    const customCssPh = escapeHtml(t('theme.editor.customCssPh'));

    const $dialog = $(`
        <div class="floating-mvu-theme-editor">
            <label>${escapeHtml(t('theme.editor.name'))}</label>
            <input type="text" class="text_pole wide100p floating-mvu-theme-name" />
            <hr class="wide100p marginTop10 marginBot10">
            <h4 class="margin0 marginBot5">${escapeHtml(t('theme.editor.bgSection'))}</h4>
            <label>${escapeHtml(t('var.imageUrl'))}</label>
            <input type="url" class="text_pole wide100p floating-mvu-theme-bg-image-url" placeholder="${escapeHtml(t('theme.editor.bgUrlPh'))}" />
            <label class="marginTop5">${escapeHtml(t('theme.editor.bgOpacity'))} <span class="floating-mvu-theme-bg-opacity-label">0%</span></label>
            <input type="range" class="floating-mvu-theme-bg-image-opacity" min="0" max="100" step="1" value="0" />
            <hr class="wide100p marginTop10 marginBot10">
            <h4 class="margin0 marginBot5">${escapeHtml(t('theme.editor.colorsSection'))}</h4>
            <div class="floating-mvu-theme-token-list"></div>
            <hr class="wide100p marginTop10 marginBot10">
            <h4 class="margin0 marginBot5">${escapeHtml(t('theme.editor.customCssSection'))}</h4>
            <textarea class="text_pole wide100p floating-mvu-theme-custom-css" rows="6" placeholder="${customCssPh}"></textarea>
            <p class="notes marginTop5">${escapeHtml(t('theme.editor.liveHint'))}</p>
        </div>
    `);

    $dialog.find('.floating-mvu-theme-name').val(draftName);
    $dialog.find('.floating-mvu-theme-custom-css').val(draftCss);

    const $list = $dialog.find('.floating-mvu-theme-token-list');

    const pushLive = () => {
        applyThemeLive(themeId, draftVars, draftCss);
    };

    const $bgUrl = $dialog.find('.floating-mvu-theme-bg-image-url');
    const $bgOpacity = $dialog.find('.floating-mvu-theme-bg-image-opacity');
    const $bgOpacityLabel = $dialog.find('.floating-mvu-theme-bg-opacity-label');

    $bgUrl.val(parsePanelBgImageUrl(draftVars[MVU_PANEL_BG_IMAGE_VAR]));
    const opacityPct = Math.round(parsePanelBgImageOpacity(draftVars[MVU_PANEL_BG_IMAGE_OPACITY_VAR]) * 100);
    $bgOpacity.val(String(opacityPct));
    $bgOpacityLabel.text(`${opacityPct}%`);

    const syncPanelBgImage = () => {
        draftVars[MVU_PANEL_BG_IMAGE_VAR] = panelBgImageUrlToCss($bgUrl.val());
        const pct = Number($bgOpacity.val());
        draftVars[MVU_PANEL_BG_IMAGE_OPACITY_VAR] = formatPanelBgImageOpacity(Number.isFinite(pct) ? pct / 100 : 0);
        $bgOpacityLabel.text(`${Math.round(parsePanelBgImageOpacity(draftVars[MVU_PANEL_BG_IMAGE_OPACITY_VAR]) * 100)}%`);
        pushLive();
    };

    $bgUrl.on('input', syncPanelBgImage);
    $bgOpacity.on('input', syncPanelBgImage);

    const swatchTitle = escapeHtml(t('theme.editor.swatchTitle'));

    for (const def of MVU_THEME_TOKEN_DEFS) {
        const value = draftVars[def.cssVar] ?? def.default;
        const label = escapeHtml(themeTokenLabel(def.key));
        const $row = $(`
            <div class="floating-mvu-theme-token-row flex-container flexGap5 marginBot5">
                <label class="floating-mvu-theme-token-label">${label}</label>
                <input type="color" class="floating-mvu-theme-swatch" title="${swatchTitle}" />
                <input type="text" class="text_pole flex1 floating-mvu-theme-token-value" data-css-var="${def.cssVar}" />
            </div>
        `);
        $row.find('.floating-mvu-theme-token-value').val(value);
        $row.find('.floating-mvu-theme-swatch').val(toColorInputValue(value));
        $row.find('.floating-mvu-theme-swatch').on('input', function () {
            const hex = String($(this).val());
            draftVars[def.cssVar] = hex;
            $row.find('.floating-mvu-theme-token-value').val(hex);
            pushLive();
        });
        $row.find('.floating-mvu-theme-token-value').on('input', function () {
            draftVars[def.cssVar] = String($(this).val()).trim();
            $row.find('.floating-mvu-theme-swatch').val(toColorInputValue(draftVars[def.cssVar]));
            pushLive();
        });
        $list.append($row);
    }

    $dialog.find('.floating-mvu-theme-custom-css').on('input', function () {
        draftCss = String($(this).val());
        pushLive();
    });

    const popup = new Popup($dialog[0], POPUP_TYPE.TEXT, '', {
        wider: true,
        allowVerticalScrolling: true,
        okButton: t('theme.editor.save'),
        cancelButton: t('var.cancel'),
    });

    const result = await popup.show();
    clearThemePreviewOverride();

    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        applyThemeLive(initialSnapshot.id, initialSnapshot.vars, initialSnapshot.customCss);
        return;
    }

    draftName = String($dialog.find('.floating-mvu-theme-name').val()).trim() || t('defaults.unnamedTheme');
    draftCss = String($dialog.find('.floating-mvu-theme-custom-css').val());

    upsertCustomTheme({
        id: themeId,
        name: draftName,
        vars: draftVars,
        customCss: draftCss,
    });
    await setActiveThemeId(themeId);
    const saved = resolveTheme(themeId);
    applyThemeLive(saved.id, saved.vars, saved.customCss);
}
