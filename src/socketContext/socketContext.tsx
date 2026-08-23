import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * TODO(refactor F9): what is this context's value during the very first render? In what
 * order do a parent's and a child's effects run? The `| null` below is a consequence,
 * not a design choice — what would have to change for it to go away?
 */
const SocketContext = createContext<AppSocket | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const backendURL = import.meta.env.VITE_SERVER_URL;

  useEffect(() => {
    const socketInstance: AppSocket = io(`${backendURL}`);
    setSocket(socketInstance);

    // Clean up when the component unmounts
    return () => {
      socketInstance.disconnect();
    };
  }, [backendURL]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
