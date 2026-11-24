import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents>;

/** Exported so tests can provide a fake socket. Use `useSocket` in components. */
export const SocketContext = createContext<AppSocket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    // Created on the first render so consumers never see a missing socket.
    const [socket] = useState(() => io(import.meta.env.VITE_SERVER_URL, { autoConnect: false }));

    useEffect(() => {
        socket.connect();
        return () => {
            socket.disconnect();
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
