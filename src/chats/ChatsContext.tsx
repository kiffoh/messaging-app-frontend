import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useState,
    type Dispatch,
    type ReactNode,
} from 'react';
import { api } from '../api';
import { chatsReducer, type ChatsAction } from './chatsReducer';
import { useChatSocket } from './useChatSocket';
import type { Chat } from '../types';

export interface ChatsContextValue {
    chats: Chat[];
    activeChat: Chat | null;
    selectChat: (id: number) => void;
    dispatch: Dispatch<ChatsAction>;
    loading: boolean;
    error: string | null;
}

export const ChatsContext = createContext<ChatsContextValue | null>(null);

export function ChatsProvider({ userId, children }: { userId: number; children: ReactNode }) {
    const [chats, dispatch] = useReducer(chatsReducer, []);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useChatSocket(dispatch);

    useEffect(() => {
        let ignore = false;
        api.get<Chat[]>('/groups')
            .then(response => {
                if (ignore) return;
                const loaded = response.data;
                dispatch({ type: 'loaded', chats: loaded });
                // Fixed once, here: a derived default would jump whenever a message
                // moved another chat to the front.
                setSelectedChatId(prev => prev ?? (loaded.find(c => c.messages.length > 0) ?? loaded[0])?.id ?? null);
            })
            .catch(() => {
                if (!ignore) setError("An error occurred when fetching the user's messages.");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [userId]);

    const activeChat = chats.find(c => c.id === selectedChatId) ?? null;

    const selectChat = useCallback((id: number) => setSelectedChatId(id), []);

    const value = useMemo(
        () => ({ chats, activeChat, selectChat, dispatch, loading, error }),
        [chats, activeChat, selectChat, loading, error],
    );

    return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}
