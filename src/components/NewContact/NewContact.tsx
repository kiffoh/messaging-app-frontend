import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import axios from 'axios';
import styles from './newContact.module.css'
import useAuth from '../../authentication/useAuth';
import type { AuthUser, SelectableUser, User, UsernameRecord } from '../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;

interface NewContactProps {
    setNewChat: Dispatch<SetStateAction<boolean>>;
    setNewContact: Dispatch<SetStateAction<boolean>>;
    user: AuthUser;
}

/** Narrows the AuthUser union to the branch that actually carries contacts. */
function contactsOf(user: AuthUser): User[] {
    return 'contacts' in user && user.contacts ? user.contacts : [];
}

function NewContact({ setNewChat, setNewContact, user }: NewContactProps) {
    const { setUser } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');

    const [allUsernames, setAllUsernames] = useState<SelectableUser[]>([]) // To check if username is in use
    // TODO(refactor F3): what determines the contents of this list? Then look at what
    // handleUserSelection has to do to keep it correct.
    const [filteredUsernames, setFilteredUsernames] = useState<SelectableUser[]>([])
    const [usernamesLoading, setUsernamesLoading] = useState(true);

    useEffect(() => {
        async function fetchAllUsernames() {
            try {
                const response = await axios.get<UsernameRecord[]>(`${backendURL}/users/usernames`);

                if (response.status !== 200) return setError('An error occurred when trying to fetch all usernames.');

                const userContactsId = new Set(contactsOf(user).map(contact => contact.id))
                const filtered = response.data
                    .filter(record => record.id !== user.id)
                    .filter(record => !userContactsId.has(record.id));

                const withSelection: SelectableUser[] = filtered.map(record => ({
                    ...record,
                    bio: '',
                    selected: false,
                }))

                setAllUsernames(withSelection); // Does not include current username for UI reasons
                setFilteredUsernames(withSelection);
            } catch (err) {
                return setError('An unknown error occurred when trying to fetch all usernames.')
            } finally {
                setUsernamesLoading(false);
            }
        }
        fetchAllUsernames();
    }, [user])

    useEffect(() => {
        function filterUsernames() {
            const trimmedSearch = search.trim();
            if (trimmedSearch === '') {
                setFilteredUsernames(allUsernames); // Show all contacts if search is empty
            } else {
                setFilteredUsernames(allUsernames.filter(record =>
                    record.username.includes(trimmedSearch)
                ));
            }
        }
        filterUsernames()
    }, [search, allUsernames])

    // Update the selected state for a contact
    function handleUserSelection(contactId: number) {
        const updatedUsers = allUsernames.map(contact =>
            contact.id === contactId ? { ...contact, selected: !contact.selected } : contact
        );
        setAllUsernames(updatedUsers);
        setFilteredUsernames(updatedUsers);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setError(null)
        }, 2000)

        return () => clearTimeout(timer); // Clean up timer on unmount
    }, [error])

    async function handleAddContacts() {
        const selectedContacts = allUsernames
            .filter(record => record.selected)
            .map(record => record.id);

        if (selectedContacts.length === 0) return setError('Select contact to add.')

        try {
            const response = await axios.put<User>(`${backendURL}/users/${user.id}/update-contacts`, {
                selectedContacts
            })

            if (response.status !== 200) return setError('An error occurred when trying to add the contacts.');
            setUser(response.data)
        } catch (err) {
            return setError('An unknown error occurred when trying to add the contacts.')
        }
    }

    return (
        <div className={styles['new-contact-root']}>
            <div className={styles['new-contact-body']}>
                <h1 className={styles.title}>Add New Contact</h1>
                <div className={styles['search-container']}>
                    <button type='button' onClick={() => setNewContact(false)} className={styles['back-btn']}>
                        Back
                    </button>
                    <input
                        type="text"
                        placeholder="Search contacts"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className={styles['cancel-btn-container']}>
                        <button
                            type='button'
                            onClick={() => {
                                setNewChat(false)
                                setNewContact(false)
                            }}
                            className={styles['cancel-btn']}
                        >X</button>
                    </div>
                </div>
                {usernamesLoading && <h2 className={styles['usernames-loading']}>Loading the users...</h2>}
                <div className={styles['usernames-container']}>
                    {filteredUsernames.length === 0 ? (
                        <p className={styles['no-users-found']}>No users found</p>
                    ) : (
                        filteredUsernames.map(record => (
                            <div key={record.id} onClick={() => handleUserSelection(record.id)} className={styles['user-div']}>
                                <img src={record.photo ?? undefined} alt='user photo' className={styles['user-photo']} />
                                <p className={styles['user-name']}>{record.username}</p>
                                <div className={styles[record.selected ? "checkbox-highlighted" : "checkbox"]}></div>
                            </div>
                        ))
                    )}
                </div>
                {error && <h3 className={styles['error']}>{error}</h3>}
                <div>
                    <button onClick={handleAddContacts} className={styles['add-contacts-btn']}>Add Contacts</button>
                </div>
            </div>
        </div>
    )
}

export default NewContact;
