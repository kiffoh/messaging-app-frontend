import { useEffect, type Dispatch } from 'react';
import { useSocket } from '../socketContext/useSocket';
import type { Message } from '../types';
import type { ChatsAction } from './chatsReducer';

/** Feeds every server broadcast into the chats reducer, whichever chat it belongs to. */
export function useChatSocket(dispatch: Dispatch<ChatsAction>): void {
    const socket = useSocket();

    useEffect(() => {
        const onNew = (message: Message) => dispatch({ type: 'messageReceived', message });
        const onUpdated = (message: Message) => dispatch({ type: 'messageUpdated', message });
        const onDeleted = (messageId: number) => dispatch({ type: 'messageDeleted', messageId });

        socket.on('newMessage', onNew);
        socket.on('messageUpdated', onUpdated);
        socket.on('messageDeleted', onDeleted);
        return () => {
            socket.off('newMessage', onNew);
            socket.off('messageUpdated', onUpdated);
            socket.off('messageDeleted', onDeleted);
        };
    }, [socket, dispatch]);
}
