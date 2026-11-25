import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import AuthContext from '../authentication/AuthContext';
import { SocketProvider } from './socketContext';
import type { AuthContextValue } from '../types';

type Handler = (arg: unknown) => void;

const { fakeSocket, handlers, ioMock } = vi.hoisted(() => {
    const handlers = new Map<string, Set<Handler>>();
    const fakeSocket = {
        on: vi.fn((event: string, fn: Handler) => {
            handlers.set(event, (handlers.get(event) ?? new Set()).add(fn));
        }),
        off: vi.fn((event: string, fn: Handler) => {
            handlers.get(event)?.delete(fn);
        }),
        connect: vi.fn(),
        disconnect: vi.fn(),
    };
    return { fakeSocket, handlers, ioMock: vi.fn((..._args: unknown[]) => fakeSocket) };
});

vi.mock('socket.io-client', () => ({ io: ioMock }));

const signOut = vi.fn();
const fire = (event: string, arg: unknown) => handlers.get(event)?.forEach(fn => fn(arg));

const renderProvider = () => render(
    <AuthContext.Provider value={{ signOut } as unknown as AuthContextValue}>
        <SocketProvider><p>child</p></SocketProvider>
    </AuthContext.Provider>
);

beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    localStorage.clear();
});

describe('SocketProvider', () => {
    it('supplies the current token to the auth callback on every connect', () => {
        renderProvider();
        const { auth } = ioMock.mock.calls[0][1] as { auth: (cb: (data: unknown) => void) => void };
        const cb = vi.fn();

        localStorage.setItem('token', 'abc');
        auth(cb);
        expect(cb).toHaveBeenLastCalledWith({ token: 'abc' });

        localStorage.setItem('token', 'def');
        auth(cb);
        expect(cb).toHaveBeenLastCalledWith({ token: 'def' });
    });

    it('signs out when the server ends the connection', () => {
        renderProvider();
        fire('disconnect', 'io server disconnect');
        expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('does not sign out on a client-initiated disconnect', () => {
        renderProvider();
        fire('disconnect', 'io client disconnect');
        expect(signOut).not.toHaveBeenCalled();
    });

    it('signs out when the handshake is unauthorized', () => {
        renderProvider();
        fire('connect_error', new Error('unauthorized'));
        expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('does not sign out on other connection errors', () => {
        renderProvider();
        fire('connect_error', new Error('xhr poll error'));
        expect(signOut).not.toHaveBeenCalled();
    });

    it('removes its handlers and disconnects on unmount', () => {
        const { unmount } = renderProvider();
        expect(fakeSocket.connect).toHaveBeenCalled();
        unmount();
        expect(fakeSocket.disconnect).toHaveBeenCalled();
        expect(handlers.get('disconnect')?.size).toBe(0);
        expect(handlers.get('connect_error')?.size).toBe(0);
    });
});
