/** SillyTavern 扩展资源路径前缀，如 third-party/Floating-MVU（随安装目录名变化） */
const EXTENSIONS_MARKER = '/scripts/extensions/';

/**
 * @returns {string}
 */
export function getExtensionResourcePrefix() {
    const pathname = decodeURIComponent(new URL(import.meta.url).pathname);
    const markerIndex = pathname.indexOf(EXTENSIONS_MARKER);
    if (markerIndex === -1) {
        return 'third-party/Floating-MVU';
    }
    const relative = pathname.slice(markerIndex + EXTENSIONS_MARKER.length);
    const dir = relative.replace(/\/[^/]+\.js$/i, '');
    return dir || 'third-party/Floating-MVU';
}
