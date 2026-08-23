import { useEffect, useRef, useState } from 'react';
import NavBar from '../NavBar/NavBar';
import styles from './userprofile.module.css'
import useAuth from '../../authentication/useAuth';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import nameGroup from '../../functions/nameGroup';
import PhotoUpload, { type PhotoUploadValue } from '../PhotoUpload/PhotoUpload';
import type { ApiErrorBody, Chat, User, UsernameRecord, ValidationError } from '../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;
const editLogo = import.meta.env.VITE_EDIT_LOGO;

/** A profile page renders either a user or a group; the `group` prop says which. */
type ProfileData = User | Chat;

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
    } | null;
}

/** Fields the PUT /profile endpoint accepts. */
interface ProfileUpdatePayload {
    username?: string;
    name?: string;
    bio?: string;
    photo?: PhotoUploadValue;
}

interface UserProfileProps {
    group: boolean;
}

/**
 * TODO(refactor F4): 15 useState and 7 useEffect. Count how many of those states hold a
 * copy of a field that is already on `chatData`. Then trace what has to happen to each
 * one on save, and again on cancel. What would adding a new profile field cost?
 */
function UserProfile({ group }: UserProfileProps) {
    const { user, setUser, checkTokenValidity } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // TODO(refactor F10): checkTokenValidity is a dependency here. Where does it come from,
    // and is it the same value on every render?
    useEffect(() => {
        const validToken = checkTokenValidity()
        if (!validToken) navigate('/users/login')
    }, [checkTokenValidity, navigate])

    const [chatData, setChatData] = useState<ProfileData | null>(null);
    const [combinedGroupName, setCombinedGroupName] = useState('')

    const [canEdit, setCanEdit] = useState(false);
    const [profilePic, setProfilePic] = useState<PhotoUploadValue>('');
    const currentProfilePic = useRef<string>('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState(''); // For UI logic
    const [bio, setBio] = useState('');

    const [allUsernames, setAllUsernames] = useState<UsernameRecord[]>([]) // To check if username is in use
    // TODO(refactor F3): note the early return in the effect below. When `username` is
    // empty, what is this list — and is that what saveEdit assumes when it checks
    // whether a username is taken?
    // The early return in the effect below also leaves it stale, and saveEdit then checks
    // username availability against that stale list.
    const [filteredUsernames, setFilteredUsernames] = useState<UsernameRecord[]>([])
    const [usernamesLoading, setUsernamesLoading] = useState(true);

    useEffect(() => {
        async function fetchAllUsernames() {
            try {
                const response = await axios.get<UsernameRecord[]>(`${backendURL}/users/usernames`);

                if (response.status !== 200) {
                    return setErrors({ usernameRetrieval: 'An error occurred when trying to fetch all usernames.' });
                }

                // Does not include current username for UI reasons
                setAllUsernames(response.data.filter(record => record.id !== Number(userId)));
            } catch (error) {
                return setErrors({ usernameRetrieval: 'An unknown error occurred when trying to fetch all usernames.' })
            } finally {
                setUsernamesLoading(false);
            }
        }
        fetchAllUsernames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        function filterUsernames() {
            if (!username) return;

            const trimmedSearch = username.trim();
            if (trimmedSearch === '') {
                setFilteredUsernames(allUsernames); // Show all contacts if search is empty
            } else {
                setFilteredUsernames(allUsernames.filter(record =>
                    record.username.includes(trimmedSearch)
                ));
            }
        }
        filterUsernames()
    }, [username, allUsernames])

    useEffect(() => {
        function editingPrivileges() {
            if (!user || !chatData) return;

            if (group && isGroupProfile(chatData)) {
                const groupAdminIds = chatData.admins.map(admin => admin.id);
                if (groupAdminIds.includes(user.id)) setCanEdit(true);
            } else {
                if (Number(userId) === user.id) setCanEdit(true);
            }
        }
        editingPrivileges()
    }, [user, chatData, userId, group])

    useEffect(() => {
        async function fetchUserProfile() {
            if (user && Number(userId) === user.id && 'bio' in user) {
                setChatData(user)

                setProfilePic(user.photo);
                currentProfilePic.current = user.photo ?? '';
                setUsername(user.username);
                setName(user.username);
                setBio(user.bio);
                setLoading(false)
            } else {
                try {
                    const response = await axios.get<ProfileData>(
                        `${backendURL}/${group ? 'groups' : 'users'}/${userId}/profile`
                    );

                    if (response.status !== 200) {
                        setErrors({ general: 'An error occurred when fetching the profile.' })
                        return;
                    }

                    const data = response.data;
                    setChatData(data)

                    setProfilePic(data.photo);
                    currentProfilePic.current = data.photo ?? '';
                    setUsername(isGroupProfile(data) ? data.name : data.username);
                    setName(isGroupProfile(data) ? data.name : data.username);
                    setBio(data.bio);

                    if (group && isGroupProfile(data)) {
                        setCombinedGroupName(nameGroup(data.members))
                    }
                } catch (error) {
                    setErrors({ general: 'An unknown error occurred' })
                } finally {
                    setLoading(false)
                }
            }
        }
        fetchUserProfile();
    }, [user, userId, group, navigate])

    useEffect(() => {
        if (!chatData) return;

        // Triggers if the group name is user selected (e.g. not the default, combinedGroupName is the default)
        if (group && isGroupProfile(chatData) && chatData.name !== combinedGroupName) {
            setUsername(chatData.name);
        }
    }, [chatData, combinedGroupName, group])

    const [editProfilePic, setEditProfilePic] = useState(false);
    const [editUsername, setEditUsername] = useState(false);
    const [editBio, setEditBio] = useState(false);

    function cancelEdit() {
        if (!chatData) return;

        if (editProfilePic) {
            setProfilePic(chatData.photo);
            setEditProfilePic(false);
        }
        if (editUsername) {
            if (group && isGroupProfile(chatData) && chatData.name !== combinedGroupName) {
                // Triggers if the group name is user selected (not the default)
                setUsername(chatData.name)
            } else {
                // Triggers for user profiles and default group names
                setUsername(isGroupProfile(chatData) ? chatData.name : chatData.username);
            }
            setEditUsername(false);
        }
        if (editBio) {
            setBio(chatData.bio);
            setEditBio(false)
        }
    }

    async function saveEdit() {
        if (!chatData) return;

        // Clear previous error messages
        setErrors(prevErrors => ({ ...prevErrors, updateErrors: null }));

        try {
            const data: ProfileUpdatePayload = {};

            if (editUsername) {
                if (username === undefined || username.trim() === "") {
                    return setErrors(prev => ({ ...prev, updateErrors: { username: "Username cannot be empty." } }));
                }
                const currentName = isGroupProfile(chatData) ? chatData.name : chatData.username;
                if (currentName !== username) {
                    const usernameTaken = filteredUsernames.some(record => record.username === username);

                    if (usernameTaken) {
                        return setErrors(prev => ({ ...prev, updateErrors: { username: 'Username is taken.' } }));
                    }

                    if (group) {
                        data.name = username;
                        setChatData(current => current && ({ ...current, name: username }));
                    } else {
                        data.username = username;
                        setChatData(current => current && ({ ...current, username: username }));
                    }
                }
            }

            if (editProfilePic) {
                if (profilePic === "") {
                    return setErrors(prev => ({ ...prev, updateErrors: { photo: "Profile picture cannot be empty." } }));
                }
                if (chatData.photo !== profilePic) {
                    data.photo = profilePic;
                    setChatData(current => current && ({ ...current, photo: profilePic as string }));
                }
            }

            if (editBio) {
                if (bio.trim() === "") {
                    return setErrors(prev => ({ ...prev, updateErrors: { bio: "Bio cannot be empty." } }));
                }
                if (chatData.bio !== bio) {
                    data.bio = bio;
                    setChatData(current => current && ({ ...current, bio: bio }));
                }
            }

            // If there's no data to send, then the put request will not be sent
            if (Object.keys(data).length !== 0) {
                // TODO(refactor): this sets a multipart/form-data header. What is actually
                // being sent as the body, and what happens when data.photo is a File?
                const response = await axios.put<ProfileData>(
                    `${backendURL}/${group ? 'groups' : 'users'}/${userId}/profile`,
                    data,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                if (response.status === 200) {
                    const updated = response.data;
                    setChatData(updated)
                    if (!group) setUser(updated as User);

                    setProfilePic(updated.photo);
                    currentProfilePic.current = updated.photo ?? '';
                    setUsername(isGroupProfile(updated) ? updated.name : updated.username);
                    setName(isGroupProfile(updated) ? updated.name : updated.username);
                    setBio(updated.bio);

                    if (group && isGroupProfile(updated)) {
                        setCombinedGroupName(nameGroup(updated.members))
                    }
                }
            }

            // Reset all edit flags after processing
            setEditProfilePic(false);
            setEditBio(false);
            setEditUsername(false);
        } catch (error) {
            if (axios.isAxiosError<ApiErrorBody>(error) && error.response) {
                const { status, data: body } = error.response;

                // Handle validation errors (status 400)
                if (status === 400) {
                    const validationErrors = body.errors;
                    if (validationErrors) {
                        // Convert array of errors to object keyed by field name
                        const errorObject = validationErrors.reduce<ProfileErrors>((acc, curr: ValidationError) => ({
                            ...acc,
                            updateErrors: { [curr.field]: curr.message }
                        }), {});
                        setErrors(errorObject);
                    }
                }
                // Handle username already exists (status 409)
                else if (status === 409) {
                    setErrors(prev => ({
                        ...prev,
                        updateErrors: { username: body.message }
                    }));
                }
                // Handle other server errors
                else {
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
            const response = await axios.delete(`${backendURL}/${group ? 'groups' : 'users'}/${userId}/profile`, {
                headers: { 'user-id': user.id }
            })
            if (response.status !== 200) {
                return setErrors({ general: 'An error occurred when trying to delete the profile.' });
            }

            navigate("/")
        } catch (error) {
            setErrors({ general: 'An unknown error occurred when trying to delete the profile.' })
        }
    }

    // TODO(refactor F6): same question as GroupMessage — how often does this run when no
    // error has occurred?
    useEffect(() => {
        const timer = setTimeout(() => {
            setErrors({})
        }, 3000)

        return () => clearTimeout(timer); // Clean up timer on unmount
    }, [errors])

    if (loading) {
        return <h1>Loading...</h1>;
    }

    return (
        <div className={styles['user-profile-root']}>
            <NavBar />
            <div className={styles['userprofile-body']}>
                <div className={styles['userprofile-flexbox']}>
                    <h2>{group ? 'Group' : 'User'} Profile</h2>
                    <p className={`${styles['error']} ${styles['photo']} ${errors.updateErrors?.photo ? styles['show'] : ''} ${errors.general ? styles['show'] : ''}`}>{errors.updateErrors?.photo ?? ''}{errors.general ?? ''}</p>
                    {chatData && (
                        <div className={styles['profile-container']}>
                            <div className={styles['user-photo-container']}>
                                {editProfilePic ? (
                                    <div className={styles['edit-photo-container']}>
                                        <img src={currentProfilePic.current} alt='user-photo' className={styles['user-photo']} draggable='false' />
                                        <PhotoUpload file={profilePic} setFile={setProfilePic} className={styles.profile} />
                                    </div>
                                ) : (
                                    <>
                                        <img src={typeof profilePic === 'string' ? profilePic : undefined} alt='user-photo' className={styles['user-photo']} draggable='false' />
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo-photo']}
                                                onClick={() => setEditProfilePic(!editProfilePic)}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            <div className={styles['username-container']}>
                                <p className={`${styles['error']} ${styles['username']} ${errors.updateErrors?.username || errors.updateErrors?.name ? styles['show'] : ''}`}>{errors.updateErrors?.username ?? ''}{errors.updateErrors?.name ?? ''}</p>
                                {editUsername ? (
                                    <>
                                        <input
                                            type='text'
                                            name='username'
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder={name}
                                        />
                                        <div className={styles['username-search']}>
                                            {errors.usernameRetrieval && <h3 className={styles['error']}>{errors.usernameRetrieval}</h3>}
                                            {!group && usernamesLoading ? (
                                                <p className={styles['username-loading']}>Loading usernames...</p>
                                            ) : (
                                                !group && filteredUsernames.length > 0 && (
                                                    <>
                                                        <p className={styles['current-usernames-title']}>Usernames in use:</p>
                                                        {filteredUsernames.map(currentUser => (
                                                            <p key={currentUser.id} className={styles['current-username']}>{currentUser.username}</p>
                                                        ))}
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h1 className={styles.username}>{group ? username || name : username}</h1>
                                        {/* Username is initially undefined for groups, but becomes defined once edited */}
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo']}
                                                onClick={() => setEditUsername(!editUsername)}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Displays group members if the group name is not the default (a combination of the members' names) */}
                            {group && isGroupProfile(chatData) && chatData.name !== combinedGroupName && (
                                <h2 className={styles['combined-group-name']}>{combinedGroupName}</h2>
                            )}

                            <div className={styles['bio-container']}>
                                <p className={`${styles['error']} ${styles['bio']} ${errors.updateErrors?.bio ? styles['show'] : ''}`}>{errors.updateErrors?.bio ?? ''}</p>
                                {editBio ? (
                                    <textarea
                                        name='bio'
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                    />
                                ) : (
                                    <>
                                        <h3>{bio}</h3>
                                        {canEdit && (
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo']}
                                                onClick={() => setEditBio(!editBio)}
                                                draggable='false'
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                            <h5>{group ? 'Group' : 'User'} Created: {chatData.createdAtTime}, {chatData.createdAtDate}</h5>
                        </div>
                    )}
                    {(editProfilePic || editUsername || editBio) && (
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

export default UserProfile;
