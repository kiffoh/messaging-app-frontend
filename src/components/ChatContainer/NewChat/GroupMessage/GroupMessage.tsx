import { useState, type FormEvent } from "react";
import { useChats } from "../../../../chats/useChats";
import useAuth from "../../../../authentication/useAuth";
import useAutoClearingState from "../../../../hooks/useAutoClearingState";
import filterByUsername from "../../../../functions/filterByUsername";
import styles from './groupMessage.module.css'
import axios from "axios";
import { api } from "../../../../api";
import PhotoUpload from "../../../PhotoUpload/PhotoUpload";
import NewContact from '../../../NewContact/NewContact'
import { AiOutlineUserAdd } from "react-icons/ai";
import { GrUser } from "react-icons/gr";
import type {
    ApiErrorBody,
    Chat,
    FieldErrors,
} from "../../../../types";

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
    const [submitting, setSubmitting] = useState(false);

    const contacts = (user?.contacts ?? []).filter(contact => contact.id !== user?.id);
    const filteredContacts = filterByUsername(contacts, search);
    const selectedContacts = contacts.filter(contact => selectedIds.has(contact.id));

    function toggleSelection(contactId: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (!next.delete(contactId)) next.add(contactId);
            return next;
        });
    }

    // Matched on member ids only: the server words unnamed groups per viewer.
    function findExistingGroup(memberIds: Set<number>): Chat | undefined {
        return chats.find(chat => !chat.directMsg
            && chat.members.length === memberIds.size
            && chat.members.every(member => memberIds.has(member.id)));
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
        if (submitting || !user) return;

        const existingChat = findExistingGroup(new Set([user.id, ...selectedIds]));
        if (existingChat) {
            selectChat(existingChat.id);
            onClose();
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('memberIds', JSON.stringify([...selectedIds]));
            formData.append('directMsg', 'false');
            if (name) formData.append('name', name);
            if (file) formData.append('photo', file);

            const { data: chat } = await api.post<Chat>('/groups', formData);
            dispatch({ type: 'chatAdded', chat });
            selectChat(chat.id);
            onClose();
        } catch (err) {
            if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.status === 400) {
                const { errors: validationErrors, message } = err.response.data;
                if (validationErrors) {
                    // Convert array of errors to object keyed by field name
                    const errorObject = validationErrors.reduce<FieldErrors>((acc, curr) => ({
                        ...acc,
                        [curr.field]: curr.message
                    }), {});
                    setErrors(errorObject);
                } else {
                    setErrors({ general: message ?? 'An error occurred when trying to create the group.' });
                }
            } else {
                setErrors({ general: 'An error occurred when trying to create the group.' })
            }
        } finally {
            setSubmitting(false);
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
                            <button type="submit" className={styles['create-btn']} disabled={submitting}>Create</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles['search-container']}>
                            <button type='button' onClick={onSwitch} className={styles['direct-message-btn']} aria-label='Direct message'>
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
                            <button type="button" className={styles['add-contact-btn']} aria-label='Add contact' onClick={() => setNewContact(true)}>
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
