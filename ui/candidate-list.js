import { t } from '../i18n/index.js';
import {
    fillSendTextarea,
    getChatCandidates,
    wrapCandidateContentForSendTextarea,
} from '../mvu/chat-candidates.js';
import { getBoundPresetForChat } from '../mvu/chat-preset.js';
import { isPresetAutoCandidateReplies } from '../mvu/schema.js';
import { FAB_ID, ROOT_ID } from '../settings.js';

export const CANDIDATE_LIST_ID = 'floating_mvu_candidate_list';

/** @type {boolean} */
let candidatesUiHiddenUntilNextUpdate = false;

/**
 * @param {boolean} hidden
 */
export function setCandidatesUiHiddenUntilNextUpdate(hidden) {
    candidatesUiHiddenUntilNextUpdate = hidden;
    refreshCandidateList();
}

/**
 * @param {import('../mvu/schema.js').MvuCandidateType} type
 */
function getCandidateTypeLabel(type) {
    switch (type) {
        case 'plot':
            return t('candidate.type.plot');
        case 'action':
            return t('candidate.type.action');
        case 'dialogue':
            return t('candidate.type.dialogue');
        case 'director':
            return t('candidate.type.director');
        default:
            return type;
    }
}

function ensureCandidateListDom() {
    const $root = $(`#${ROOT_ID}`);
    if (!$root.length) {
        return null;
    }
    let $list = $(`#${CANDIDATE_LIST_ID}`);
    if (!$list.length) {
        $root.prepend(`
            <div id="${CANDIDATE_LIST_ID}" class="floating-mvu-candidate-list" role="list" aria-label="${t('candidate.listAria')}"></div>
        `);
        $list = $(`#${CANDIDATE_LIST_ID}`);
    }
    return $list;
}

function syncCandidateListPosition() {
    const fab = document.getElementById(FAB_ID);
    const list = document.getElementById(CANDIDATE_LIST_ID);
    if (!fab || !list) {
        return;
    }
    const rect = fab.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(300, Math.max(200, rect.width * 4));
    list.style.width = `${width}px`;
    list.style.top = `${Math.max(8, rect.top - gap)}px`;
    list.style.left = `${rect.right - width}px`;
    list.style.transform = 'translateY(-100%)';
}

export function refreshCandidateList() {
    const $list = ensureCandidateListDom();
    if (!$list) {
        return;
    }

    const preset = getBoundPresetForChat();
    const items = getChatCandidates();
    const shouldShow = Boolean(
        preset
        && isPresetAutoCandidateReplies(preset)
        && items.length
        && !candidatesUiHiddenUntilNextUpdate,
    );

    if (!shouldShow) {
        $list.empty().addClass('floating-mvu-candidate-list-hidden');
        return;
    }

    $list.removeClass('floating-mvu-candidate-list-hidden');
    $list.empty();

    for (const item of items) {
        const $row = $(`
            <button type="button" class="floating-mvu-candidate-row" role="listitem" title="${t('candidate.clickHint')}">
                <span class="floating-mvu-candidate-content"></span>
                <span class="floating-mvu-candidate-type"></span>
            </button>
        `);
        $row.find('.floating-mvu-candidate-content').text(item.content);
        $row.find('.floating-mvu-candidate-type').text(getCandidateTypeLabel(item.type));
        $row.on('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const wrapped = wrapCandidateContentForSendTextarea(item.content, item.type);
            fillSendTextarea(wrapped);
        });
        $list.append($row);
    }

    requestAnimationFrame(syncCandidateListPosition);
}

export function bindCandidateListFabFollow() {
    const fab = document.getElementById(FAB_ID);
    if (!fab || fab.dataset.floatingMvuCandidateFollow === '1') {
        return;
    }
    fab.dataset.floatingMvuCandidateFollow = '1';
    const observer = new MutationObserver(() => {
        refreshCandidateList();
    });
    observer.observe(fab, { attributes: true, attributeFilter: ['style', 'class'] });
}
