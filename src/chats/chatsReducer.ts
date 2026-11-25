import type { AuthorPhotoMap, Chat, Message, User } from '../types';

export type ChatsAction =
    | { type: 'loaded'; chats: Chat[] }
    | { type: 'chatAdded'; chat: Chat }
    | { type: 'messageReceived'; message: Message }
    | { type: 'messageUpdated'; message: Message }
    | { type: 'messageDeleted'; messageId: number };

export function chatsReducer(state: Chat[], action: ChatsAction): Chat[] {
    switch (action.type) {
        case 'loaded':
            return action.chats;

        case 'chatAdded':
            return state.some(c => c.id === action.chat.id) ? state : [action.chat, ...state];

        case 'messageReceived': {
            // The server broadcasts to every client, so this may be a chat we aren't in,
            // or a message we already have (reconnect, StrictMode double-subscribe).
            const { message } = action;
            const target = state.find(c => c.id === message.groupId);
            if (!target || target.messages.some(m => m.id === message.id)) return state;
            const updated = { ...target, messages: [message, ...target.messages] };
            return [updated, ...state.filter(c => c !== target)];
        }

        case 'messageUpdated': {
            const { message } = action;
            if (!state.some(c => c.messages.some(m => m.id === message.id))) return state;
            return state.map(c => c.messages.some(m => m.id === message.id)
                ? { ...c, messages: c.messages.map(m => (m.id === message.id ? message : m)) }
                : c);
        }

        case 'messageDeleted': {
            // The payload carries no chat id, so find the holder by message id.
            const { messageId } = action;
            if (!state.some(c => c.messages.some(m => m.id === messageId))) return state;
            return state.map(c => c.messages.some(m => m.id === messageId)
                ? { ...c, messages: c.messages.filter(m => m.id !== messageId) }
                : c);
        }
    }
}

export function photoMapFor(members: User[], fallback: string): AuthorPhotoMap {
    return Object.fromEntries(members.map(m => [m.id, m.photo ?? fallback]));
}
