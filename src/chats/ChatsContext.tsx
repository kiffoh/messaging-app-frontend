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
import axios from 'axios';
import { chatsReducer, normaliseChat, type ChatsAction } from './chatsReducer';
import { useChatSocket } from './useChatSocket';
import type { ApiChat, Chat } from '../types';

const backendURL = import.meta.env.VITE_SERVER_URL;

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
        axios.get<ApiChat[]>(`${backendURL}/messages/${userId}`)
            .then(response => {
                if (!ignore) dispatch({ type: 'loaded', chats: response.data.map(normaliseChat) });
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

    // Until the user picks one, show the first chat that has any messages.
    const activeId = selectedChatId ?? chats.find(c => c.messages.length > 0)?.id;
    const activeChat = chats.find(c => c.id === activeId) ?? null;

    const selectChat = useCallback((id: number) => setSelectedChatId(id), []);

    const value = useMemo(
        () => ({ chats, activeChat, selectChat, dispatch, loading, error }),
        [chats, activeChat, selectChat, loading, error],
    );

    return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}
