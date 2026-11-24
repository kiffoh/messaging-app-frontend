import { useContext } from 'react';
import { SocketContext, type AppSocket } from './socketContext';

export function useSocket(): AppSocket {
    const socket = useContext(SocketContext);
    if (!socket) throw new Error('useSocket must be used inside a <SocketProvider>');
    return socket;
}
