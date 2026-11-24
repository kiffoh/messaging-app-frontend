import { useState, type FormEvent } from "react";
import { normaliseChat } from "../../../../chats/chatsReducer";
import { useChats } from "../../../../chats/useChats";
import useAuth from "../../../../authentication/useAuth";
import useAutoClearingState from "../../../../hooks/useAutoClearingState";
import filterByUsername from "../../../../functions/filterByUsername";
import styles from './groupMessage.module.css'
import axios from "axios";
import nameGroup from "../../../../functions/nameGroup";
import PhotoUpload from "../../../PhotoUpload/PhotoUpload";
import NewContact from '../../../NewContact/NewContact'
import { AiOutlineUserAdd } from "react-icons/ai";
import { GrUser } from "react-icons/gr";
import type {
    ApiErrorBody,
    Chat,
    CreateChatResponse,
    FieldErrors,
    User,
} from "../../../../types";

const backendURL = import.meta.env.VITE_SERVER_URL;

interface GroupMessageProps {
    onClose: () => void;
    onSwitch: () => void;
}

function GroupMessage({ onClose, onSwitch }: GroupMessageProps) {
    const { user } = useAuth();
    const { chats, selectChat, dispatch } = useChats();
    const [errorState, setErrors] = useAutoClearingState<FieldErrors>(2000);
    const error: FieldErrors = errorState ?? {};
    const [nextStage, setNextStage] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null); // For file upload
    const [search, setSearch] = useState('');
    const [newContact, setNewContact] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const contacts = user?.contacts ?? [];
    const filteredContacts = filterByUsername(contacts, search);
    const selectedContacts = contacts.filter(contact => selectedIds.has(contact.id));

    function toggleSelection(contactId: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (!next.delete(contactId)) next.add(contactId);
            return next;
        });
    }

    const groupChats = chats.filter(chat => chat.directMsg === false);

    function arraysEqual(arr1: number[], arr2: number[]): boolean {
        if (arr1.length !== arr2.length) return false;
        const sortedArr1 = [...arr1].sort();
        const sortedArr2 = [...arr2].sort();
        return sortedArr1.every((value, index) => value === sortedArr2[index]);
    }

    const findUserChat = (groupMembers: Pick<User, 'id'>[], groupName: string): Chat | null => {
        const groupMemberIds = groupMembers.map(member => member.id);

        for (const chat of groupChats) {
            if (chat.name === groupName) {
                const chatMemberIds = chat.members.map(member => member.id);
                if (arraysEqual(groupMemberIds, chatMemberIds)) {
                    return chat;
                }
            }
        }
        return null;
    }

    function handleNextSubmit() {
        if (selectedContacts.length > 1) {
            setNextStage(true)
        } else {
            // A group requires at least 2 other members (not including the user)
            setErrors({
                selection: selectedContacts.length === 0
                    ? 'A group requires at least 2 more contacts.'
                    : 'A group requires at least 1 more contact.'
            })
        }
    }

    async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const groupMembers = [user as User, ...selectedContacts];
            const groupName = name ? name : nameGroup(groupMembers);
            const existingChat = findUserChat(groupMembers, groupName);

            if (existingChat) {
                selectChat(existingChat.id);
                onClose();
            } else {
                // Prepare the form data
                const formData = new FormData();

                // Add members & name
                formData.append('members', JSON.stringify(groupMembers));
                if (name) {
                    formData.append('name', name)
                }

                // Conditionally add the group photo if provided
                if (file) {
                    formData.append('groupPhoto', file); // `groupPhoto` is the field name the backend expects
                }

                const response = await axios.post<CreateChatResponse>(
                    `${backendURL}/groups/createGroup`,
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                if (response.status === 200 || response.status === 201) {
                    const apiChat = response.data.newGroup ?? response.data.existingGroup;

                    if (apiChat) {
                        const data = normaliseChat(apiChat);
                        dispatch({ type: 'chatAdded', chat: data });
                        selectChat(data.id);
                        onClose();
                    } else {
                        setErrors({ general: 'Failed to create the group.' });
                    }
                } else {
                    setErrors({ general: 'Failed to create the group.' });
                }
            }
        } catch (err) {
            if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.status === 400) {
                const validationErrors = err.response.data.errors;
                if (validationErrors) {
                    // Convert array of errors to object keyed by field name
                    const errorObject = validationErrors.reduce<FieldErrors>((acc, curr) => ({
                        ...acc,
                        [curr.field]: curr.message
                    }), {});
                    setErrors(errorObject);
                }
            } else {
                setErrors({ general: 'An error occurred when trying to create the group.' })
            }
        }
    }

    if (newContact) {
        return <NewContact onBack={() => setNewContact(false)} onClose={onClose} />;
    }

    return (
        <div className={styles['group-message-body']}>
            <form onSubmit={handleFormSubmit} className={styles['group-message-form']}>
                {nextStage ? (
                    <>
                        <div className={styles['selected-contacts-container']}>
                            {selectedContacts.map(contact => (
                                <div key={contact.id} className={styles['selected-contact-div']}>
                                    <img src={contact.photo ?? undefined} alt='contact photo' className={styles['selected-contact-photo']} draggable='false' />
                                    <p className={styles['selected-contact-name']}>{contact.username}</p>
                                </div>
                            ))}
                        </div>
                        <div className={styles['photo-container']}>
                            <label htmlFor="photo">
                                Add group icon (optional)
                            </label>
                            <PhotoUpload file={file} onChange={setFile} className={styles['group-message']} />
                            <p className={`${styles['error']} ${styles['photo']} ${error.photo ? styles['show'] : ''}`}>{error.photo ?? ''}</p>
                        </div>
                        <div className={styles['group-name-container']}>
                            <label htmlFor="name" className={styles['group-name']}>
                                Provide a group name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Group name (optional)"
                                className={styles['group-name-input']}
                            />
                        </div>
                        <div className={styles['btns-container']}>
                            <p className={`${styles['error']} ${styles['general-name']} ${error.general || error.name ? styles['show'] : ''}`}>{error.general ?? ''}{error.name ?? ''}</p>
                            <button type="button" onClick={() => setNextStage(false)} className={styles['back-btn']}>Back</button>
                            <button type="submit" className={styles['create-btn']}>Create</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles['search-container']}>
                            <button type='button' onClick={onSwitch} className={styles['direct-message-btn']}>
                                <GrUser size={24} />
                            </button>
                            <input
                                type="text"
                                placeholder="Search contacts"
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
                                    <div key={contact.id} onClick={() => toggleSelection(contact.id)} className={styles['contact-div']}>
                                        <img src={contact.photo ?? undefined} alt='contact photo' className={styles['contact-photo']} />
                                        <p className={styles['contact-name']}>{contact.username}</p>
                                        <div className={styles[selectedIds.has(contact.id) ? "checkbox-highlighted" : "checkbox"]}></div>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className={`${styles['error']} ${error.selection ? styles['show'] : ''}`}>{error.selection ?? ''}</p>
                        <div className={styles['add-contact-btn-container']}>
                            <button type="button" className={styles['add-contact-btn']} onClick={() => setNewContact(true)}>
                                <AiOutlineUserAdd size={24} />
                            </button>
                            <div className={styles['next-btn-container']}>
                                <button type='button' onClick={handleNextSubmit} className={styles['next-btn']}>Next</button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </div>
    )
}

export default GroupMessage;
