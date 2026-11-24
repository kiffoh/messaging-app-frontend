import { useState } from 'react';
import DirectMessage from './NewChat/DirectMessage/DirectMessage';
import DisplayedChat from './DisplayedChat/DisplayedChat';
import GroupMessage from './NewChat/GroupMessage/GroupMessage';
import { useChats } from '../../chats/useChats';

interface ChatContainerProps {
    newChat: boolean;
    onClose: () => void;
}

function ChatContainer({ newChat, onClose }: ChatContainerProps) {
    const { activeChat } = useChats();
    const [newGroup, setNewGroup] = useState(false);

    if (newChat) {
        return newGroup
            ? <GroupMessage onClose={onClose} onSwitch={() => setNewGroup(false)} />
            : <DirectMessage onClose={onClose} onSwitch={() => setNewGroup(true)} />;
    }

    if (!activeChat) return null;

    return <DisplayedChat key={activeChat.id} displayedChat={activeChat} />;
}

export default ChatContainer;
