import { describe, expect, it } from 'vitest';
import { chatsReducer, normaliseChat, photoMapFor } from './chatsReducer';
import type { ApiChat, Chat, Message, User } from '../types';

const msg = (id: number, groupId: number, content = `m${id}`): Message => ({
    id, groupId, content, authorId: 1, photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
});
const chat = (id: number, messages: Message[] = []): Chat => ({
    id, name: `c${id}`, photo: '', bio: '', directMsg: false, members: [], admins: [], messages,
});
const user = (id: number, photo: string | null): User => ({ id, username: `u${id}`, photo, bio: '' });

describe('chatsReducer', () => {
    it('loaded replaces the list', () => {
        expect(chatsReducer([chat(1)], { type: 'loaded', chats: [chat(2)] })).toEqual([chat(2)]);
    });

    it('messageReceived prepends and moves the chat to the front', () => {
        const state = [chat(1, [msg(1, 1)]), chat(2, [msg(2, 2)])];
        const next = chatsReducer(state, { type: 'messageReceived', message: msg(3, 2) });
        expect(next.map(c => c.id)).toEqual([2, 1]);
        expect(next[0].messages.map(m => m.id)).toEqual([3, 2]);
    });

    it('messageReceived for an unknown groupId returns the same state', () => {
        const state = [chat(1)];
        expect(chatsReducer(state, { type: 'messageReceived', message: msg(9, 99) })).toBe(state);
    });

    it('messageReceived ignores a duplicate message id', () => {
        const state = [chat(1, [msg(1, 1)])];
        expect(chatsReducer(state, { type: 'messageReceived', message: msg(1, 1) })).toBe(state);
    });

    it('messageUpdated replaces by id', () => {
        const state = [chat(1, [msg(2, 1), msg(1, 1)])];
        const next = chatsReducer(state, { type: 'messageUpdated', message: msg(1, 1, 'edited') });
        expect(next[0].messages.map(m => m.content)).toEqual(['m2', 'edited']);
    });

    it('messageUpdated for an unknown message returns the same state', () => {
        const state = [chat(1, [msg(1, 1)])];
        expect(chatsReducer(state, { type: 'messageUpdated', message: msg(7, 1) })).toBe(state);
    });

    it('messageDeleted removes the id from the right chat', () => {
        const state = [chat(1, [msg(1, 1)]), chat(2, [msg(2, 2), msg(3, 2)])];
        const next = chatsReducer(state, { type: 'messageDeleted', messageId: 2 });
        expect(next[0]).toBe(state[0]);
        expect(next[1].messages.map(m => m.id)).toEqual([3]);
    });

    it('messageDeleted for an unknown id returns the same state', () => {
        const state = [chat(1, [msg(1, 1)])];
        expect(chatsReducer(state, { type: 'messageDeleted', messageId: 42 })).toBe(state);
    });

    it('chatAdded prepends and dedupes', () => {
        const state = [chat(1)];
        expect(chatsReducer(state, { type: 'chatAdded', chat: chat(2) }).map(c => c.id)).toEqual([2, 1]);
        expect(chatsReducer(state, { type: 'chatAdded', chat: chat(1) })).toBe(state);
    });
});

describe('normaliseChat', () => {
    it('defaults missing messages to []', () => {
        const apiChat: ApiChat = { ...chat(1), messages: undefined };
        expect(normaliseChat(apiChat).messages).toEqual([]);
    });

    it('keeps existing messages', () => {
        expect(normaliseChat(chat(1, [msg(1, 1)])).messages).toHaveLength(1);
    });
});

describe('photoMapFor', () => {
    it('substitutes the fallback for a null photo', () => {
        expect(photoMapFor([user(1, 'a.png'), user(2, null)], 'default.png')).toEqual({ 1: 'a.png', 2: 'default.png' });
    });
});
