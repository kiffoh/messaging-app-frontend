import { useState } from "react";
import { normaliseChat } from "../../../../chats/chatsReducer";
import { useChats } from "../../../../chats/useChats";
import useAuth from "../../../../authentication/useAuth";
import useAutoClearingState from "../../../../hooks/useAutoClearingState";
import filterByUsername from "../../../../functions/filterByUsername";
import styles from './directMessage.module.css'
import axios from "axios";
import { AiOutlineUserAdd } from "react-icons/ai";
import { GrGroup } from "react-icons/gr";
import NewContact from "../../../NewContact/NewContact";
import type { Chat, CreateChatResponse, User } from "../../../../types";

const backendURL = import.meta.env.VITE_SERVER_URL;

interface DirectMessageProps {
    onClose: () => void;
    onSwitch: () => void;
}

function DirectMessage({ onClose, onSwitch }: DirectMessageProps) {
    const { user } = useAuth();
    const { chats, selectChat, dispatch } = useChats();
    const [error, setError] = useAutoClearingState<string>(2000);
    const [search, setSearch] = useState('');
    const [newContact, setNewContact] = useState(false);

    const directMessageChats = chats.filter(chat => chat.directMsg === true);
    const filteredContacts = filterByUsername(user?.contacts ?? [], search);

    const findUserChat = (recipient: User): Chat | null => {
        for (const chat of directMessageChats) {
            if (chat.members.some(member => member.id === recipient.id)) {
                return chat;
            }
        }
        return null;
    }

    async function handleFormSubmit(recipient: User) {
        const existingChat = findUserChat(recipient)

        if (existingChat) {
            selectChat(existingChat.id);
        } else {
            try {
                const response = await axios.post<CreateChatResponse>(
                    `${backendURL}/groups/createDirectMessage`,
                    { members: [user, recipient] }
                );

                const apiChat = response.data.newGroup ?? response.data.existingGroup;
                if (!apiChat) return setError('Failed to create the chat.');

                const data = normaliseChat(apiChat);
                dispatch({ type: 'chatAdded', chat: data });
                selectChat(data.id);
            } catch {
                return setError('An error occurred when trying to create the chat.');
            }
        }
        onClose();
    }

    if (newContact) {
        return <NewContact onBack={() => setNewContact(false)} onClose={onClose} />;
    }

    return (
        <div className={styles['direct-message-body']}>
            <form className={styles['direct-message-form']}>
                {error && <h3 className={styles['error']}>{error}</h3>}
                <div className={styles['search-container']}>
                    <button type='button' onClick={onSwitch} className={styles['new-group-btn']} aria-label='New group'>
                        <GrGroup size={24} />
                    </button>
                    <input
                        type="text"
                        placeholder="Search contacts"
                        className={styles['search-bar']}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className={styles['cancel-btn-container']}>
                        <button type='button' onClick={onClose} className={styles['cancel-btn']}>X</button>
                    </div>
                </div>
                <div className={styles['contacts-container']}>
                    {filteredContacts.length === 0 ? (
                        <p className={styles['no-contacts-found']}>No contacts found</p>
                    ) : (
                        filteredContacts.map(contact => (
                            <div key={contact.id} onClick={() => handleFormSubmit(contact)} className={styles['contact-div']}>
                                <img src={contact.photo ?? undefined} alt='contact photo' className={styles['contact-photo']} draggable='false' />
                                <p className={styles['contact-name']}>{contact.username}</p>
                            </div>
                        ))
                    )}
                </div>
                <div className={styles['add-contact-btn-container']}>
                    <button type="button" className={styles['add-contact-btn']} aria-label='Add contact' onClick={() => setNewContact(true)}>
                        <AiOutlineUserAdd size={24} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default DirectMessage;
