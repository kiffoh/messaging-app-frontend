import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import styles from './groupMessage.module.css'
import axios from "axios";
import nameGroup from "../../../../functions/nameGroup";
import PhotoUpload from "../../../PhotoUpload/PhotoUpload";
import NewContact from '../../../NewContact/NewContact'
import { AiOutlineUserAdd } from "react-icons/ai";
import { GrUser } from "react-icons/gr";
import type {
    ApiErrorBody,
    AuthUser,
    Chat,
    CreateChatResponse,
    FieldErrors,
    SelectableUser,
    User,
} from "../../../../types";

const backendURL = import.meta.env.VITE_SERVER_URL;

/** TODO(refactor F16): thirteen props. How many does this component use itself? */
interface GroupMessageProps {
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
    handleContactSelection: (contactId: number) => void;
    contacts: SelectableUser[];
    newContact: boolean;
    setNewContact: Dispatch<SetStateAction<boolean>>;
}

function GroupMessage({
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
    handleContactSelection,
    contacts,
    newContact,
    setNewContact,
}: GroupMessageProps) {
    const [error, setErrors] = useState<FieldErrors>({});
    const [nextStage, setNextStage] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null); // For file upload
    const [selectedContacts, setSelectedContacts] = useState<SelectableUser[]>([])

    const groupChats = userChats.filter(chat => chat.directMsg === false);

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

    // TODO(refactor F6): put a console.log inside this effect and open the group form
    // without triggering any error. How often does it run, and why?
    useEffect(() => {
        const timer = setTimeout(() => {
            setErrors({})
        }, 2000)

        return () => clearTimeout(timer); // Clean up timer on unmount
    }, [error])

    function handleNextSubmit() {
        // Displays the contacts selected for the group chat
        const tempSelectedContacts = contacts.filter(contact => contact.selected);

        if (tempSelectedContacts.length > 1) {
            setNextStage(true)
            setSelectedContacts(tempSelectedContacts)
        } else {
            // A group requires at least 2 other members (not including the user)
            setErrors({
                selection: tempSelectedContacts.length === 0
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
                setDisplayedChat(existingChat);
                setDisplayedChatId(existingChat.id);
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
                    const data = response.data.newGroup ?? response.data.existingGroup;

                    if (data) {
                        setDisplayedChat(data);
                        setDisplayedChatId(data.id);
                        setUserChats(prevChats => [data, ...prevChats]);

                        setNewChat(false);
                        setNextStage(false);
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
        return <NewContact setNewChat={setNewChat} setNewContact={setNewContact} user={user} />;
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
                            <PhotoUpload file={file} setFile={setFile} className={styles['group-message']} />
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
                            <button type='button' onClick={() => setNewGroup(false)} className={styles['direct-message-btn']}>
                                <GrUser size={24} />
                            </button>
                            <input
                                type="text"
                                placeholder="Search contacts"
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
                                    <div key={contact.id} onClick={() => handleContactSelection(contact.id)} className={styles['contact-div']}>
                                        <img src={contact.photo ?? undefined} alt='contact photo' className={styles['contact-photo']} />
                                        <p className={styles['contact-name']}>{contact.username}</p>
                                        <div className={styles[contact.selected ? "checkbox-highlighted" : "checkbox"]}></div>
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
