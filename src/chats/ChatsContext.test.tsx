import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { ChatsProvider } from './ChatsContext';
import { useChats } from './useChats';
import { SocketContext, type AppSocket } from '../socketContext/socketContext';
import type { ApiChat, Message } from '../types';

vi.mock('axios');

function makeFakeSocket() {
    const handlers = new Map<string, Set<(payload: unknown) => void>>();
    const socket = {
        on: (event: string, fn: (payload: unknown) => void) => {
            handlers.set(event, (handlers.get(event) ?? new Set()).add(fn));
        },
        off: (event: string, fn: (payload: unknown) => void) => {
            handlers.get(event)?.delete(fn);
        },
    };
    const fire = (event: string, payload: unknown) =>
        act(() => handlers.get(event)?.forEach(fn => fn(payload)));
    return { socket: socket as unknown as AppSocket, fire };
}

const message = (id: number, groupId: number): Message => ({
    id, groupId, content: `m${id}`, authorId: 1, photoUrl: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
});

const chat = (id: number, messages?: Message[]): ApiChat => ({
    id, name: `chat${id}`, photo: '', bio: '', directMsg: true, members: [], admins: [], messages,
});

function Probe() {
    const { chats, activeChat, loading } = useChats();
    if (loading) return <p>loading</p>;
    return (
        <>
            <p data-testid="active">{activeChat?.id ?? 'none'}</p>
            <p data-testid="order">{chats.map(c => c.id).join(',')}</p>
            <p data-testid="counts">{chats.map(c => c.messages.length).join(',')}</p>
        </>
    );
}

describe('ChatsProvider', () => {
    beforeEach(() => {
        vi.mocked(axios.get).mockResolvedValue({
            status: 200,
            data: [chat(1), chat(2, [message(10, 2)])],
        });
    });

    it('defaults the active chat to the first one with messages', async () => {
        const { socket } = makeFakeSocket();
        render(
            <SocketContext.Provider value={socket}>
                <ChatsProvider userId={1}><Probe /></ChatsProvider>
            </SocketContext.Provider>,
        );
        await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('2'));
    });

    it('applies a message for a chat that is not open and moves that chat first', async () => {
        const { socket, fire } = makeFakeSocket();
        render(
            <SocketContext.Provider value={socket}>
                <ChatsProvider userId={1}><Probe /></ChatsProvider>
            </SocketContext.Provider>,
        );
        await screen.findByTestId('order');

        fire('newMessage', message(11, 1));

        expect(screen.getByTestId('order').textContent).toBe('1,2');
        expect(screen.getByTestId('counts').textContent).toBe('1,1');
    });
});
