import { useState, type Dispatch, type SetStateAction } from "react";
import styles from './directMessage.module.css'
import axios from "axios";
import { AiOutlineUserAdd } from "react-icons/ai";
import { GrGroup } from "react-icons/gr";
import NewContact from "../../../NewContact/NewContact";
import type { AuthUser, Chat, CreateChatResponse, SelectableUser, User } from "../../../../types";

const backendURL = import.meta.env.VITE_SERVER_URL;

/**
 * TODO(refactor F16): twelve props, six of which are setters reaching back into App's
 * state. Once the chat state is a reducer behind a context, this collapses to the
 * contacts it actually renders plus a dispatch.
 */
interface DirectMessageProps {
    setNewChat: Dispatch<SetStateAction<boolean>>;
    filteredContacts: SelectableUser[];
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    setDisplayedChat: Dispatch<SetStateAction<Chat | null>>;
    userChats: Chat[];
    user: AuthUser;
    setDisplayedChatId: Dispatch<SetStateAction<number | null>>;
    setUserChats: Dispatch<SetStateAction<Chat[]>>;
    setNewGroup: Dispatch<SetStateAction<boolean>>;
    newContact: boolean;
    setNewContact: Dispatch<SetStateAction<boolean>>;
}

function DirectMessage({
    setNewChat,
    filteredContacts,
    search,
    setSearch,
    setDisplayedChat,
    userChats,
    user,
    setDisplayedChatId,
    setUserChats,
    setNewGroup,
    newContact,
    setNewContact,
}: DirectMessageProps) {
    const [error, setError] = useState<string | null>(null);
    const directMessageChats = userChats.filter(chat => chat.directMsg === true);

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
            setDisplayedChat(existingChat);
            setDisplayedChatId(existingChat.id);
        } else {
            try {
                const response = await axios.post<CreateChatResponse>(
                    `${backendURL}/groups/createDirectMessage`,
                    { members: [user, recipient] }
                );

                if (response.status === 200 || response.status === 201) {
                    const data = response.data.newGroup ?? response.data.existingGroup;

                    if (data) {
                        setDisplayedChat(data);
                        setDisplayedChatId(data.id);
                        setUserChats(prevChats => [data, ...prevChats]);
                    } else {
                        setError('Failed to create the chat.');
                    }
                } else {
                    setError('Failed to create the chat.');
                }
            } catch (err) {
                setError('An error occurred when trying to create the chat.')
            }
        }
        setNewChat(false);
    }

    if (newContact) {
        return <NewContact setNewChat={setNewChat} setNewContact={setNewContact} user={user} />;
    }

    return (
        <div className={styles['direct-message-body']}>
            <form className={styles['direct-message-form']}>
                {error && <h3 className={styles['error']}>{error}</h3>}
                <div className={styles['search-container']}>
                    <button type='button' onClick={() => setNewGroup(true)} className={styles['new-group-btn']}>
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
                        <button type='button' onClick={() => setNewChat(false)} className={styles['cancel-btn']}>X</button>
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
                    <button type="button" className={styles['add-contact-btn']} onClick={() => setNewContact(true)}>
                        <AiOutlineUserAdd size={24} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default DirectMessage;
