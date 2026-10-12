import { t } from '../i18n/index.js';
import {
    getPresetVariables,
    getVariableRangeBounds,
} from './schema.js';
import { applyMvuTextVariableMacros } from './text-macros.js';

/** 最近对话与 MVU 变量说明块之间的分隔线 */
export const MVU_PROMPT_SECTION_SEPARATOR = '---';

/**
 * @param {import('./schema.js').MvuVariableNode['varType']} varType
 * @returns {string}
 */
function getVariableTypeLabel(varType) {
    switch (varType) {
        case 'longtext':
            return t('prompt.type.longtext');
        case 'range':
            return t('prompt.type.range');
        case 'text':
        default:
            return t('prompt.type.text');
    }
}

/** @typedef {Record<string, string | number>} MvuCurrentValuesMap */

/**
 * @param {import('./schema.js').MvuVariableNode} variable
 * @param {MvuCurrentValuesMap} [currentValues]
 * @returns {string}
 */
function formatCurrentValueForVariable(variable, currentValues = {}) {
    const name = String(variable.name ?? '').trim();
    if (!name || currentValues[name] === undefined || currentValues[name] === null) {
        return t('prompt.valueNone');
    }
    const raw = currentValues[name];
    if (variable.varType === 'range') {
        return String(raw);
    }
    if (variable.varType === 'longtext' || variable.varType === 'text') {
        const text = applyMvuTextVariableMacros(String(raw).trim());
        return text.length ? text : t('prompt.valueNone');
    }
    const text = String(raw).trim();
    return text.length ? text : t('prompt.valueNone');
}

/**
 * @param {import('./schema.js').MvuVariableNode} variable
 * @returns {string[]}
 */
function formatVariableConstraintLines(variable) {
    if (variable.varType === 'range') {
        const { min, max } = getVariableRangeBounds(variable);
        return [t('prompt.range', { min, max })];
    }
    if (variable.varType === 'longtext') {
        const max = variable.textMaxLength;
        if (typeof max === 'number' && max > 0) {
            return [t('prompt.lenMax', { max })];
        }
        return [t('prompt.lenUnlimited')];
    }
    return [t('prompt.lenDash')];
}

/**
 * @param {import('./schema.js').MvuVariableNode} variable
 * @param {number} index
 * @returns {string}
 */
function formatVariableBlock(variable, index, currentValues = {}) {
    const name = String(variable.name ?? '').trim() || t('var.unnamed');
    const description = String(variable.description ?? '').trim() || t('prompt.descNone');
    const lines = [
        t('prompt.varBlock', { index: index + 1 }),
        t('prompt.varName', { name }),
        t('prompt.varType', { type: getVariableTypeLabel(variable.varType) }),
        t('prompt.varDesc', { desc: description }),
        ...formatVariableConstraintLines(variable),
        t('prompt.varCurrent', { value: formatCurrentValueForVariable(variable, currentValues) }),
    ];
    return lines.join('\n');
}

/**
 * @param {import('./schema.js').MvuVariableNode[]} variables
 * @returns {string}
 */
function buildExampleFloatingMvuTag(variables) {
    /** @type {Record<string, string | number>} */
    const payload = {};
    for (const variable of variables) {
        const name = String(variable.name ?? '').trim() || t('var.unnamed');
        if (variable.varType === 'range') {
            const { min, max } = getVariableRangeBounds(variable);
            payload[name] = Math.round((min + max) / 2);
            continue;
        }
        payload[name] = t('prompt.exampleValue');
    }
    return `<floating-mvu>${JSON.stringify(payload)}</floating-mvu>`;
}

function getMvuResponseFormatBlock() {
    return [
        t('prompt.responseBlock'),
        '<floating-mvu>{JSON}</floating-mvu>',
    ].join('\n');
}

/**
 * @returns {string}
 */
export function getMvuPromptFormatFooter() {
    return t('prompt.footer');
}

/**
 * @param {import('./schema.js').MvuPreset} preset
 * @param {MvuCurrentValuesMap} [currentValues]
 * @returns {string}
 */
export function buildMvuDialoguePrompt(preset, currentValues = {}) {
    const variables = getPresetVariables(preset).filter(v => v.varType !== 'image');

    /** @type {string[]} */
    const sections = [t('prompt.prefix'), '', t('prompt.section.variables'), ''];

    if (!variables.length) {
        sections.push(t('prompt.noVariables'), '');
        sections.push(getMvuResponseFormatBlock(), '', t('prompt.section.example'), '<floating-mvu>{}</floating-mvu>');
        return sections.join('\n').trim();
    }

    variables.forEach((variable, index) => {
        sections.push(formatVariableBlock(variable, index, currentValues));
        sections.push('');
    });

    sections.push(getMvuResponseFormatBlock());
    sections.push('');
    sections.push(t('prompt.section.example'));
    sections.push(buildExampleFloatingMvuTag(variables));

    return sections.join('\n').trim();
}
