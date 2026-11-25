import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { api } from '../../../../api';
import AuthContext from '../../../../authentication/AuthContext';
import { ChatsContext, type ChatsContextValue } from '../../../../chats/ChatsContext';
import GroupMessage from './GroupMessage';
import type { AuthContextValue, Chat, User } from '../../../../types';

const bob: User = { id: 2, username: 'bob', photo: null, bio: null };
const carol: User = { id: 3, username: 'carol', photo: null, bio: null };
const self: User = { id: 1, username: 'alice', photo: null, bio: null };
const me: User = { ...self, contacts: [self, bob, carol] };

afterEach(() => { vi.restoreAllMocks(); });

function setup() {
    const chats: ChatsContextValue = {
        chats: [], activeChat: null, selectChat: vi.fn(), dispatch: vi.fn(), loading: false, error: null,
    };
    const auth: AuthContextValue = { user: me, loading: false, setUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
    const onClose = vi.fn();
    render(
        <AuthContext.Provider value={auth}>
            <ChatsContext.Provider value={chats}>
                <GroupMessage onClose={onClose} onSwitch={vi.fn()} />
            </ChatsContext.Provider>
        </AuthContext.Provider>,
    );
    return { chats, onClose };
}

async function reachSecondStage() {
    await userEvent.click(screen.getByText('bob'));
    await userEvent.click(screen.getByText('carol'));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
}

describe('GroupMessage', () => {
    it('does not offer the caller as a contact', () => {
        setup();
        expect(screen.queryByText('alice')).not.toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('sends one request when Create is submitted twice quickly', async () => {
        let resolve!: (value: { data: Chat }) => void;
        const post = vi.spyOn(api, 'post').mockReturnValue(new Promise(r => { resolve = r; }));
        const chat: Chat = { id: 9, name: 'g', photo: '', bio: null, directMsg: false, members: [], messages: [] };
        const { chats, onClose } = setup();
        await reachSecondStage();

        const create = screen.getByRole('button', { name: 'Create' });
        await userEvent.dblClick(create);
        await userEvent.click(create);
        expect(post).toHaveBeenCalledTimes(1);

        const [url, body] = post.mock.calls[0] as [string, FormData];
        expect(url).toBe('/groups');
        expect(JSON.parse(body.get('memberIds') as string)).toEqual([2, 3]);
        expect(body.get('directMsg')).toBe('false');
        expect(body.has('name')).toBe(false);

        resolve({ data: chat });
        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(chats.dispatch).toHaveBeenCalledWith({ type: 'chatAdded', chat });
    });

    it('shows the server message when a 400 has no field errors', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, null, {
            data: { message: 'A chat needs at least one other member.' }, status: 400, statusText: '', headers: {},
            config: {} as never,
        }));
        setup();
        await reachSecondStage();
        await userEvent.click(screen.getByRole('button', { name: 'Create' }));

        expect(await screen.findByText('A chat needs at least one other member.')).toBeInTheDocument();
    });
});
