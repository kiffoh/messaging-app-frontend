import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import DirectMessage from './NewChat/DirectMessage/DirectMessage';
import DisplayedChat from './DisplayedChat/DisplayedChat';
import GroupMessage from './NewChat/GroupMessage/GroupMessage';
import type { AuthUser, AuthorPhotoMap, Chat, SelectableUser, User } from '../../types';

/**
 * TODO(refactor F16): eleven props in, eight of them passed straight through untouched.
 * Six are setters, which means the leaves below mutate App's state directly. Reading
 * this interface is the clearest statement of the problem phase 4 solves.
 */
interface ChatContainerProps {
    user: AuthUser;
    displayedChat: Chat | null;
    setDisplayedChat: Dispatch<SetStateAction<Chat | null>>;
    newChat: boolean;
    setNewChat: Dispatch<SetStateAction<boolean>>;
    userChats: Chat[];
    setDisplayedChatId: Dispatch<SetStateAction<number | null>>;
    setUserChats: Dispatch<SetStateAction<Chat[]>>;
    authorIdToPhotoURL: AuthorPhotoMap;
    setAuthorIdToPhotoURL: Dispatch<SetStateAction<AuthorPhotoMap>>;
    userClick: boolean;
    setUserClick: Dispatch<SetStateAction<boolean>>;
}

/** Narrows the AuthUser union to the branch that actually carries contacts. */
function contactsOf(user: AuthUser): User[] {
    return 'contacts' in user && user.contacts ? user.contacts : [];
}

function ChatContainer({
    user,
    displayedChat,
    setDisplayedChat,
    newChat,
    setNewChat,
    userChats,
    setDisplayedChatId,
    setUserChats,
    authorIdToPhotoURL,
    setAuthorIdToPhotoURL,
    userClick,
    setUserClick,
}: ChatContainerProps) {
    const [search, setSearch] = useState('')
    const [contacts, setContacts] = useState<SelectableUser[]>([]) // Need id's names and photos
    const [newGroup, setNewGroup] = useState(false);
    const [newContact, setNewContact] = useState(false);

    // TODO(refactor F3): derived from contacts + search, so it should not be state.
    const [filteredContacts, setFilteredContacts] = useState<SelectableUser[]>([])

    useEffect(() => {
        const userContacts = contactsOf(user);
        if (userContacts.length > 0) {
            const contactsWithSelection: SelectableUser[] = userContacts.map(contact => ({
                ...contact,
                selected: false // Initialize as not selected
            }));
            setContacts(contactsWithSelection);
            setFilteredContacts(contactsWithSelection);
        }
    }, [user, newChat])

    useEffect(() => {
        function filterContacts() {
            const trimmedSearch = search.trim();
            if (trimmedSearch === '') {
                setFilteredContacts(contacts); // Show all contacts if search is empty
            } else {
                setFilteredContacts(contacts.filter(contact =>
                    contact.username.includes(trimmedSearch)
                ));
            }
        }
        filterContacts()
    }, [search, contacts])

    // Update the selected state for a contact
    function handleContactSelection(contactId: number) {
        const updatedContacts = contacts.map(contact =>
            contact.id === contactId ? { ...contact, selected: !contact.selected } : contact
        );
        setContacts(updatedContacts);
        setFilteredContacts(updatedContacts);
    }

    if (newChat) {
        return newGroup ? (
            <GroupMessage
                setNewChat={setNewChat}
                search={search}
                setSearch={setSearch}
                filteredContacts={filteredContacts}
                setDisplayedChat={setDisplayedChat}
                userChats={userChats}
                user={user}
                setDisplayedChatId={setDisplayedChatId}
                setUserChats={setUserChats}
                setNewGroup={setNewGroup}
                handleContactSelection={handleContactSelection}
                contacts={contacts}
                newContact={newContact}
                setNewContact={setNewContact}
            />
        ) : (
            <DirectMessage
                setNewChat={setNewChat}
                search={search}
                setSearch={setSearch}
                filteredContacts={filteredContacts}
                setDisplayedChat={setDisplayedChat}
                userChats={userChats}
                user={user}
                setDisplayedChatId={setDisplayedChatId}
                setUserChats={setUserChats}
                setNewGroup={setNewGroup}
                newContact={newContact}
                setNewContact={setNewContact}
            />
        );
    }

    if (!displayedChat) return null;

    return (
        <DisplayedChat
            displayedChat={displayedChat}
            user={user}
            authorIdToPhotoURL={authorIdToPhotoURL}
            setDisplayedChat={setDisplayedChat}
            setAuthorIdToPhotoURL={setAuthorIdToPhotoURL}
            userClick={userClick}
            setUserClick={setUserClick}
        />
    );
}

export default ChatContainer;
