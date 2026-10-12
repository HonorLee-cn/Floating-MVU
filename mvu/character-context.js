import {
    getCharacterCardFields,
    name1,
    name2,
} from '../../../../../script.js';
import { t } from '../i18n/index.js';

/**
 * @returns {{ block: string, charName: string, userName: string, description: string }}
 */
export function buildMvuCharacterContextBlock() {
    const fields = getCharacterCardFields();
    const charName = String(name2 ?? '').trim() || t('prompt.unnamedChar');
    const userName = String(name1 ?? '').trim() || t('prompt.unnamedUser');
    const description = String(fields.description ?? '').trim();

    const block = [
        t('prompt.section.charUser'),
        t('prompt.charName', { name: charName }),
        t('prompt.userName', { name: userName }),
        '',
        t('prompt.section.charDesc'),
        description || t('prompt.noDescription'),
    ].join('\n');

    return { block, charName, userName, description };
}
