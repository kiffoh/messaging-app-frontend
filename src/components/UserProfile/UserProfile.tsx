import { useEffect, useState } from 'react';
import NavBar from '../NavBar/NavBar';
import styles from './userprofile.module.css'
import useAuth from '../../authentication/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import nameGroup from '../../functions/nameGroup';
import filterByUsername from '../../functions/filterByUsername';
import useAutoClearingState from '../../hooks/useAutoClearingState';
import PhotoUpload from '../PhotoUpload/PhotoUpload';
import type { ApiErrorBody, Chat, User, UsernameRecord } from '../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;
const editLogo = import.meta.env.VITE_EDIT_LOGO;

/** A profile page renders either a user or a group; the `group` prop says which. */
type ProfileData = User | Chat;
type Field = 'photo' | 'name' | 'bio';

function isGroupProfile(data: ProfileData): data is Chat {
    return 'members' in data;
}

interface ProfileErrors {
    general?: string;
    usernameRetrieval?: string;
    updateErrors?: {
        username?: string;
        name?: string;
        photo?: string;
        bio?: string;
    };
}

function displayNameOf(profile: ProfileData): string {
    return isGroupProfile(profile) ? profile.name : profile.username;
}

interface UserProfileProps {
    /** User id, or group id when `group` is set. Remount (via `key`) to show another profile. */
    id: number;
    group: boolean;
}

function UserProfile({ id, group }: UserProfileProps) {
    const { user, setUser, signOut } = useAuth();
    const navigate = useNavigate();
    const isOwnUser = !group && user?.id === id;

    const [profile, setProfile] = useState<ProfileData | null>(isOwnUser ? user : null);
    const [editing, setEditing] = useState<Set<Field>>(new Set());
    const [draft, setDraft] = useState({
        name: profile ? displayNameOf(profile) : '',
        bio: profile?.bio ?? '',
        photo: null as File | null,
    });
    const [errors, setErrors] = useAutoClearingState<ProfileErrors>(3000);
    const [allUsernames, setAllUsernames] = useState<UsernameRecord[]>([]);
    const [loading, setLoading] = useState(profile === null);

    // Fetch unless the cached signed-in user already is this profile.
    useEffect(() => {
        if (isOwnUser) return;
        let cancelled = false;
        axios.get<ProfileData>(`${backendURL}/${group ? 'groups' : 'users'}/${id}/profile`)
            .then(response => {
                if (cancelled) return;
                setProfile(response.data);
                setDraft({ name: displayNameOf(response.data), bio: response.data.bio, photo: null });
            })
            .catch(() => { if (!cancelled) setErrors({ general: 'An unknown error occurred' }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id, group, isOwnUser, setErrors]);

    useEffect(() => {
        if (group) return;
        let cancelled = false;
        axios.get<UsernameRecord[]>(`${backendURL}/users/usernames`)
            .then(response => { if (!cancelled) setAllUsernames(response.data); })
            .catch(() => {
                if (!cancelled) setErrors({ usernameRetrieval: 'An unknown error occurred when trying to fetch all usernames.' });
            });
        return () => { cancelled = true; };
    }, [group, setErrors]);

    const canEdit = !!user && !!profile && (
        isGroupProfile(profile) && group
            ? (profile.admins ?? []).some(admin => admin.id === user.id)
            : user.id === id
    );
    const displayName = profile ? displayNameOf(profile) : '';
    const defaultGroupName = profile && isGroupProfile(profile) ? nameGroup(profile.members) : '';
    const otherUsernames = allUsernames.filter(record => record.id !== id);
    const usernameSuggestions = filterByUsername(otherUsernames, draft.name);

    function startEditing(field: Field) {
        setEditing(prev => new Set(prev).add(field));
    }

    function cancelEdit() {
        if (!profile) return;
        setDraft({ name: displayNameOf(profile), bio: profile.bio, photo: null });
        setEditing(new Set());
    }

    async function saveEdit() {
        if (!profile) return;

        const formData = new FormData();
        const fail = (updateErrors: NonNullable<ProfileErrors['updateErrors']>) => setErrors({ updateErrors });

        if (editing.has('name')) {
            if (draft.name.trim() === '') return fail({ username: 'Username cannot be empty.' });
            if (draft.name !== displayName) {
                if (!group && otherUsernames.some(record => record.username === draft.name)) {
                    return fail({ username: 'Username is taken.' });
                }
                formData.append(group ? 'name' : 'username', draft.name);
            }
        }

        if (editing.has('photo') && draft.photo) formData.append('photo', draft.photo);

        if (editing.has('bio') && draft.bio !== profile.bio) {
            if (draft.bio.trim() === '') return fail({ bio: 'Bio cannot be empty.' });
            formData.append('bio', draft.bio);
        }

        try {
            // No Content-Type header: the browser adds the multipart boundary itself.
            if (Array.from(formData.keys()).length > 0) {
                const response = await axios.put<ProfileData>(
                    `${backendURL}/${group ? 'groups' : 'users'}/${id}/profile`,
                    formData
                );
                setProfile(response.data);
                if (isOwnUser) setUser(response.data as User);
                setDraft({ name: displayNameOf(response.data), bio: response.data.bio, photo: null });
            }
            setEditing(new Set());
        } catch (error) {
            if (axios.isAxiosError<ApiErrorBody>(error) && error.response) {
                const { status, data: body } = error.response;

                if (status === 400 && body.errors) {
                    setErrors({
                        updateErrors: Object.fromEntries(body.errors.map(e => [e.field, e.message])),
                    });
                } else if (status === 409) {
                    setErrors({ updateErrors: { username: body.message } });
                } else {
                    setErrors({ general: body.message ?? 'An error occurred during when updating the profile' });
                }
            } else {
                setErrors({ general: 'Unable to connect to the server' });
            }
        }
    }

    async function deleteProfile() {
        if (!user) return;
        if (!window.confirm(`Are you sure you want to delete this ${group ? 'group' : 'profile'}?`)) {
            return;
        }

        try {
            await axios.delete(`${backendURL}/${group ? 'groups' : 'users'}/${id}/profile`, {
                headers: { 'user-id': user.id }
            });
            if (!group) signOut();
            navigate("/");
        } catch {
            setErrors({ general: 'An unknown error occurred when trying to delete the profile.' });
        }
    }

    const updateErrors = errors?.updateErrors;

    if (loading) {
        return <h1>Loading...</h1>;
    }

    return (
        <div className={styles['user-profile-root']}>
            <NavBar />
            <div className={styles['userprofile-body']}>
                <div className={styles['userprofile-flexbox']}>
                    <h2>{group ? 'Group' : 'User'} Profile</h2>
                    <p className={`${styles['error']} ${styles['photo']} ${updateErrors?.photo || errors?.general ? styles['show'] : ''}`}>{updateErrors?.photo ?? ''}{errors?.general ?? ''}</p>
                    {profile && (
                        <div className={styles['profile-container']}>
                            <div className={styles['user-photo-container']}>
                                {editing.has('photo') ? (
                                    <div className={styles['edit-photo-container']}>
                                        <img src={profile.photo ?? undefined} alt='user-photo' className={styles['user-photo']} draggable='false' />
                                        <PhotoUpload file={draft.photo} onChange={photo => setDraft(d => ({ ...d, photo }))} className={styles.profile} />
                                    </div>
                                ) : (
                                    <>
                                        <img src={profile.photo ?? undefined} alt='user-photo' className={styles['user-photo']} draggable='false' />
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo-photo']}
                                                onClick={() => startEditing('photo')}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            <div className={styles['username-container']}>
                                <p className={`${styles['error']} ${styles['username']} ${updateErrors?.username || updateErrors?.name ? styles['show'] : ''}`}>{updateErrors?.username ?? ''}{updateErrors?.name ?? ''}</p>
                                {editing.has('name') ? (
                                    <>
                                        <input
                                            type='text'
                                            name='username'
                                            value={draft.name}
                                            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                                            placeholder={displayName}
                                        />
                                        <div className={styles['username-search']}>
                                            {errors?.usernameRetrieval && <h3 className={styles['error']}>{errors.usernameRetrieval}</h3>}
                                            {!group && usernameSuggestions.length > 0 && (
                                                <>
                                                    <p className={styles['current-usernames-title']}>Usernames in use:</p>
                                                    {usernameSuggestions.map(record => (
                                                        <p key={record.id} className={styles['current-username']}>{record.username}</p>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h1 className={styles.username}>{displayName}</h1>
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo']}
                                                onClick={() => startEditing('name')}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Shows the members when the group has a custom name instead of the default member list */}
                            {isGroupProfile(profile) && profile.name !== defaultGroupName && (
                                <h2 className={styles['combined-group-name']}>{defaultGroupName}</h2>
                            )}

                            <div className={styles['bio-container']}>
                                <p className={`${styles['error']} ${styles['bio']} ${updateErrors?.bio ? styles['show'] : ''}`}>{updateErrors?.bio ?? ''}</p>
                                {editing.has('bio') ? (
                                    <textarea
                                        name='bio'
                                        value={draft.bio}
                                        onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                                    />
                                ) : (
                                    <>
                                        <h3>{profile.bio}</h3>
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo']}
                                                onClick={() => startEditing('bio')}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                            <h5>{group ? 'Group' : 'User'} Created: {profile.createdAtTime}, {profile.createdAtDate}</h5>
                        </div>
                    )}
                    {editing.size > 0 && (
                        <div className={styles['btns-container']}>
                            <div className={styles['edit-btns-container']}>
                                <button type='button' className={styles['cancel-edit']} onClick={cancelEdit}>Cancel</button>
                                <button type='button' className={styles['save-edit']} onClick={saveEdit}>Save</button>
                            </div>
                            <div className={styles['delete-btn-container']}>
                                <button type='button' className={styles['delete-profile']} onClick={deleteProfile}>Delete {group ? 'group' : 'profile'}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function ProfileRoute({ group }: { group: boolean }) {
    const params = useParams();
    const id = params[group ? 'groupId' : 'userId'];
    // key remounts on navigation so no draft or edit state leaks between profiles
    return <UserProfile key={id} id={Number(id)} group={group} />;
}

export default UserProfile;
