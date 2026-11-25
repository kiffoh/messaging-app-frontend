import { useState, useEffect } from 'react';
import { api } from '../../api';
import styles from './newContact.module.css'
import useAuth from '../../authentication/useAuth';
import useAutoClearingState from '../../hooks/useAutoClearingState';
import filterByUsername from '../../functions/filterByUsername';
import type { User, UserSummary } from '../../types';

interface NewContactProps {
    onBack: () => void;
    onClose: () => void;
}

function NewContact({ onBack, onClose }: NewContactProps) {
    const { user, setUser } = useAuth();
    const [error, setError] = useAutoClearingState<string>(2000);

    const [search, setSearch] = useState('');

    const [allUsernames, setAllUsernames] = useState<UserSummary[]>([]) // Users who are not yet contacts
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [usernamesLoading, setUsernamesLoading] = useState(true);

    useEffect(() => {
        async function fetchAllUsernames() {
            if (!user) return;
            try {
                const response = await api.get<UserSummary[]>('/users');

                const userContactsId = new Set((user.contacts ?? []).map(contact => contact.id))
                setAllUsernames(response.data.filter(record =>
                    record.id !== user.id && !userContactsId.has(record.id)
                ));
            } catch (err) {
                return setError('An unknown error occurred when trying to fetch all usernames.')
            } finally {
                setUsernamesLoading(false);
            }
        }
        fetchAllUsernames();
    }, [user, setError])

    const filteredUsernames = filterByUsername(allUsernames, search);

    function toggleSelection(contactId: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (!next.delete(contactId)) next.add(contactId);
            return next;
        });
    }

    async function handleAddContacts() {
        if (!user) return;
        const selectedContacts = [...selectedIds];

        if (selectedContacts.length === 0) return setError('Select contact to add.')

        try {
            const response = await api.put<User>(`/users/${user.id}/contacts`, {
                contactIds: selectedContacts
            })

            setUser(response.data);
            setSelectedIds(new Set());
        } catch (err) {
            return setError('An unknown error occurred when trying to add the contacts.')
        }
    }

    return (
        <div className={styles['new-contact-root']}>
            <div className={styles['new-contact-body']}>
                <h1 className={styles.title}>Add New Contact</h1>
                <div className={styles['search-container']}>
                    <button type='button' onClick={onBack} className={styles['back-btn']}>
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
                            onClick={onClose}
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
                            <div key={record.id} onClick={() => toggleSelection(record.id)} className={styles['user-div']}>
                                <img src={record.photo ?? undefined} alt='user photo' className={styles['user-photo']} />
                                <p className={styles['user-name']}>{record.username}</p>
                                <div className={styles[selectedIds.has(record.id) ? "checkbox-highlighted" : "checkbox"]}></div>
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
