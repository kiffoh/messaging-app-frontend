import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../../../../api';
import AuthContext from '../../../../authentication/AuthContext';
import { ChatsContext, type ChatsContextValue } from '../../../../chats/ChatsContext';
import DirectMessage from './DirectMessage';
import type { AuthContextValue, Chat, User } from '../../../../types';

const bob: User = { id: 2, username: 'bob', photo: null, bio: null };
const me: User = { id: 1, username: 'alice', photo: null, bio: null, contacts: [bob] };

afterEach(() => { vi.restoreAllMocks(); });

describe('DirectMessage', () => {
    it('sends one request when a contact is clicked twice quickly', async () => {
        let resolve!: (value: { data: Chat }) => void;
        const post = vi.spyOn(api, 'post').mockReturnValue(new Promise(r => { resolve = r; }));
        const chat: Chat = { id: 9, name: 'bob', photo: '', bio: null, directMsg: true, members: [me, bob], messages: [] };
        const chats: ChatsContextValue = {
            chats: [], activeChat: null, selectChat: vi.fn(), dispatch: vi.fn(), loading: false, error: null,
        };
        const auth: AuthContextValue = { user: me, loading: false, setUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
        const onClose = vi.fn();
        render(
            <AuthContext.Provider value={auth}>
                <ChatsContext.Provider value={chats}>
                    <DirectMessage onClose={onClose} onSwitch={vi.fn()} />
                </ChatsContext.Provider>
            </AuthContext.Provider>,
        );

        await userEvent.dblClick(screen.getByText('bob'));
        expect(post).toHaveBeenCalledTimes(1);
        expect(post).toHaveBeenCalledWith('/groups', { memberIds: [2], directMsg: true });

        resolve({ data: chat });
        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(chats.dispatch).toHaveBeenCalledWith({ type: 'chatAdded', chat });
        expect(chats.selectChat).toHaveBeenCalledWith(9);
    });
});
