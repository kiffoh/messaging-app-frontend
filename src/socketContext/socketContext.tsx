import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import useAuth from '../authentication/useAuth';
import type { ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents>;

/** Exported so tests can provide a fake socket. Use `useSocket` in components. */
export const SocketContext = createContext<AppSocket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { signOut } = useAuth();
    // Created on the first render so consumers never see a missing socket.
    // The auth function reads the token again on every (re)connect.
    const [socket] = useState(() => io(import.meta.env.VITE_SERVER_URL, {
        autoConnect: false,
        auth: (cb) => cb({ token: localStorage.getItem('token') }),
    }));

    useEffect(() => {
        // The server disconnects a socket when its token expires and rejects a bad token at the handshake.
        const onDisconnect = (reason: string) => {
            if (reason === 'io server disconnect') signOut();
        };
        const onConnectError = (err: Error) => {
            if (err.message === 'unauthorized') signOut();
        };
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.connect();
        return () => {
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.disconnect();
        };
    }, [socket, signOut]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
