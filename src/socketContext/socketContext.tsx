import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * TODO(refactor F9): the socket is created inside an effect, so this context value is
 * `null` for the first commit. React runs child effects before parent effects, so any
 * consumer calling `socket.on(...)` on mount would throw — it only works today because
 * App's loading gate delays mounting them. The `| null` in this type is the compiler
 * telling you the same thing.
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
