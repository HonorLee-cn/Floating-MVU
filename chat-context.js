import { default_avatar, getCurrentChatDetails, getCurrentChatId } from '../../../../script.js';

export function isActiveChatContext() {
    return getCurrentChatId() !== undefined;
}

export function getActiveChatId() {
    const id = getCurrentChatId();
    return id === undefined ? undefined : String(id);
}

export function getChatAvatarUrl() {
    const { avatarImgURL } = getCurrentChatDetails();
    return avatarImgURL || default_avatar;
}
