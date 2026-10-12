import { getSettings } from './settings.js';

const LOG_PREFIX = '[FloatingMVU]';

/**
 * @returns {boolean}
 */
export function isFloatingMvuDebugEnabled() {
    return getSettings().debugMode === true;
}

/**
 * @param {...unknown} args
 */
export function floatingMvuDebugLog(...args) {
    if (!isFloatingMvuDebugEnabled()) {
        return;
    }
    console.log(LOG_PREFIX, ...args);
}

/**
 * @param {...unknown} args
 */
export function floatingMvuDebugWarn(...args) {
    if (!isFloatingMvuDebugEnabled()) {
        return;
    }
    console.warn(LOG_PREFIX, ...args);
}

/**
 * @param {...unknown} args
 */
export function floatingMvuDebugError(...args) {
    if (!isFloatingMvuDebugEnabled()) {
        return;
    }
    console.error(LOG_PREFIX, ...args);
}

/**
 * @param {...unknown} args
 */
export function floatingMvuDebugTrace(...args) {
    if (!isFloatingMvuDebugEnabled()) {
        return;
    }
    console.debug(LOG_PREFIX, ...args);
}
