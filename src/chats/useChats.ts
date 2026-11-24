import { useContext } from 'react';
import { ChatsContext, type ChatsContextValue } from './ChatsContext';

export function useChats(): ChatsContextValue {
    const context = useContext(ChatsContext);
    if (!context) throw new Error('useChats must be used inside a <ChatsProvider>');
    return context;
}
