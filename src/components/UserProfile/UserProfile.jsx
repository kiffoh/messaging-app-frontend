import { useEffect, useRef, useState } from 'react';
import NavBar from '../NavBar/NavBar';
import styles from './userprofile.module.css'
import useAuth from '../../authentication/useAuth';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import nameGroup from '../../functions/nameGroup';
import { useNavigate } from 'react-router-dom';
import PhotoUpload from '../PhotoUpload/PhotoUpload';
const backendURL = import.meta.env.VITE_SERVER_URL;
const editLogo = import.meta.env.VITE_EDIT_LOGO;



function UserProfile({group}) {
    // I want to import the navbar and footer I use from the Homepage into here
    const {user, setUser, checkTokenValidity} = useAuth();
    const {userId} = useParams();
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const validToken = checkTokenValidity()
        if (!validToken) navigate('/users/login')
      }, [checkTokenValidity, navigate])

    const [chatData, setChatData] = useState(null);
    const [combinedGroupName, setCombinedGroupName] = useState('')

    const [canEdit, setCanEdit] = useState(false);
    const [profilePic, setProfilePic] = useState('');
    let currentProfilePic = useRef('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState(''); // For UI logic, 
    const [bio, setBio] = useState('');

    
    const [allUsernames, setAllUsernames] = useState([]) // To check if username is in use
    const [filteredUsernames, setFilteredUsernames] = useState([])
    const [usernamesLoading, setUsernamesLoading] = useState(true);

    useEffect(() => {
        async function fetchAllUsernames() {
            try {
                const response = await axios.get(`${backendURL}/users/usernames`);
        
                if (response.status != 200) return setErrors({usernameRetrieval:'An error occurred when trying to fetch all usernames.'});
                
                setAllUsernames(response.data.filter(user => user.id !== parseInt(userId))); // Does not include current username for UI reasons        
            } catch (error) {
                return setErrors({usernameRetrieval: 'An unknown error occurred when trying to fetch all usernames.'})
            } finally {
                setUsernamesLoading(false);
            }
        }
        fetchAllUsernames();
    }, [])

    useEffect(() =>{
        function filterUsernames() {
            if (!username) return;

            const trimmedSearch = username.trim();
            if (trimmedSearch === '') {
                setFilteredUsernames(allUsernames); // Show all contacts if search is empty
            } else {
                const updatedUsernames = allUsernames.filter(user => 
                    user.username.includes(trimmedSearch)
                );
                setFilteredUsernames(updatedUsernames);
            }
        }
        filterUsernames()
    }, [username, allUsernames])

    useEffect(() => {
        function editingPrivileges() {
            if (!user || !chatData) return;

            if (group) {
                const groupAdminIds = chatData.admins.map(admin => admin.id);
                if (groupAdminIds.includes(user.id)) setCanEdit(true);
            } else {
                if (parseInt(userId) === user.id) setCanEdit(true);
            }
        } 
        editingPrivileges()
    }, [user, chatData, userId, group])
    

    useEffect(() => {
        async function fetchUserProfile() {
            if (user && parseInt(userId) === user.id) {
                setChatData(user)

                setProfilePic(user.photo);
                currentProfilePic.current = user.photo;
                setUsername(user.username);
                setName(user.username);
                setBio(user.bio);
                setLoading(false)
            } 
            else {
                try {
                    const response = await axios.get(`${backendURL}/${group ? 'groups': 'users'}/${userId}/profile`);
                    
                    if (response.status !== 200) {
                        setErrors({general: 'An error occurred when fetching the profile.'})
                        return;
                    }

                    setChatData(response.data)
                    
                    setProfilePic(response.data.photo);
                    currentProfilePic.current = response.data.photo;
                    setUsername(response.data.username);
                    setName(response.data.name || response.data.username);
                    setBio(response.data.bio);

                    if (group) {
                        setCombinedGroupName(nameGroup(response.data.members))
                    }
                } catch (error) {
                    setErrors({general: 'An unknown error occurred'})
                    console.error('Error fetching data:', error);
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
        if (group && chatData.name !== combinedGroupName) setUsername(chatData.name);  
    }, [chatData, combinedGroupName, group])

    const [editProfilePic, setEditProfilePic] = useState(false);
    const [editUsername, setEditUsername] = useState(false);
    const [editBio, setEditBio] = useState(false);

    function cancelEdit() {
        if (editProfilePic) {
            setProfilePic(chatData.photo);
            setEditProfilePic(false);
        }
        if (editUsername) {
            if (group && chatData.name !== combinedGroupName) { // Triggers if the group name is user selected (e.g. not the default, combinedGroupName is the default) 
                setUsername(chatData.name)
            } else { // Triggers for user profiles and default group names
                setUsername(chatData.username);
            }    
            setEditUsername(false);
        }
        if (editBio) {
            setBio(chatData.bio);
            setEditBio(false)
        }
    }

    async function saveEdit() {
        // Clear previous error messages
        setErrors(prevErrors => ({ ...prevErrors, updateErrors: null }));  

        try {
            let data = {};
            
            if (editUsername) {
                if (username === undefined || username.trim() === "") return setErrors(prevErrors => ({...prevErrors, updateErrors: {username: "Username cannot be empty."}}));
                const currentName = group ? chatData.name : chatData.username;
                if (currentName !== username ) {

                    const usernameTaken = filteredUsernames.some((user) => user.username === username);

                    if (usernameTaken) return setErrors(prevErrors => ({...prevErrors, updateErrors: {username: 'Username is taken.'}}));

                    if (group) {
                        data.name = username;
                        setChatData(current => ({ ...current, name: username }));
                    } else {
                        data.username = username;
                        setChatData(current => ({ ...current, username: username }));
                    }
                }
            }

            if (editProfilePic) {
                if (profilePic === "") return setErrors(prevErrors => ({...prevErrors, updateErrors: {photo: "Profile picture cannot be empty."}}));
                if (chatData.photo !== profilePic) {
                    data.photo = profilePic;
                    setChatData(current => ({ ...current, photo: profilePic }));
                }
            }

            if (editBio) {
                if (bio.trim() === "") return setErrors(prevErrors => ({...prevErrors, updateErrors: {bio: "Bio cannot be empty."}}));
                if (chatData.bio !== bio) {
                    data.bio = bio;
                    setChatData(current => ({ ...current, bio: bio }));
                }
            }

            // If there's no data to send, then the put request will not be sent
            if (Object.keys(data).length != 0) {
                console.log(data)
                const response = await axios.put(`${backendURL}/${group ? 'groups': 'users'}/${userId}/profile`, data, {
                    headers: {
                        'Content-Type': 'multipart/form-data' // Important for file uploads
                    }
                });
                
                if (response.status === 200) {
                    setChatData(response.data)
                    if (!group) setUser(response.data);
                    
                    setProfilePic(response.data.photo);
                    currentProfilePic.current = response.data.photo;
                    setUsername(response.data.username);
                    setName(response.data.name || response.data.username);
                    setBio(response.data.bio);
        
                    if (group) {
                        setCombinedGroupName(nameGroup(response.data.members))
                    }
                }
                    
            }

            // Reset all edit flags after processing
            setEditProfilePic(false);
            setEditBio(false);
            setEditUsername(false);
        } catch (error) {
            // Add validation errors here?
            console.log("Error: ", error)
            if (error.response) {
                // Handle validation errors (status 400)
                if (error.response.status === 400) {
                    const validationErrors = error.response.data.errors;
                    if (validationErrors) {
                        // Convert array of errors to object keyed by field name
                        const errorObject = validationErrors.reduce((acc, curr) => ({
                            ...acc,
                            updateErrors: {[curr.field]: curr.message}
                        }), {});
                        setErrors(errorObject);
                    }
                }
                // Handle username already exists (status 409)
                else if (error.response.status === 409) {
                    setErrors(prevErrors => (
                        {...prevErrors,
                        updateErrors: {username: error.response.data.message}
                    }));
                }
                // Handle other server errors
                else {
                    setErrors({
                        general: error.response.data.message || 'An error occurred during when updating the profile'
                    });
                }
            } else {
                setErrors({
                    general: 'Unable to connect to the server'
                });
            }
        }
    }

    async function deleteProfile() { // Why is ESlint telling me: deleteProfile' is declared but its value is never read?
        if (!window.confirm(`Are you sure you want to delete this ${group ? 'group' : 'profile'}?`)) {
            return;
        }
        
        try {
            const response = await axios.delete(`${backendURL}/${group ? 'groups': 'users'}/${userId}/profile`, {
                headers: {'user-id': user.id }
            })
            if (response.status != 200) return setErrors({general: 'An error occurred when trying to delete the profile.'});
        
            navigate("/")
        } catch (error) {
            setErrors({general: 'An unknown error occurred when trying to delete the profile.'})
        }
        
    }

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
                    <p className={`${styles['error']} ${styles['photo']} ${errors.updateErrors?.photo ? styles['show'] : ''} ${errors.general ? styles['show'] : ''}`}>{errors.updateErrors?.photo ? errors.updateErrors.photo : ''}{errors.general ? errors.general : ''}</p>
                    {chatData &&
                    <div className={styles['profile-container']}>
                        <div className={styles['user-photo-container']}>
                            {editProfilePic ? (
                            <div className={styles['edit-photo-container']}>
                                <img src={currentProfilePic.current} alt='user-photo' className={styles['user-photo']} draggable='false'></img>
                                <PhotoUpload file={profilePic} setFile={setProfilePic} className={styles.profile}/>
                            </div>
                            ) : (
                            <>
                                <img src={profilePic} alt='user-photo' className={styles['user-photo']} draggable='false'></img>
                                {canEdit && 
                                    <img
                                        src={editLogo}
                                        alt='Edit logo'
                                        className={styles['edit-logo-photo']}
                                        onClick={() => setEditProfilePic(!editProfilePic)}
                                        draggable='false'
                                    />}
                            </>
                            )}
                        </div>

                        <div className={styles['username-container']}>
                            <p className={`${styles['error']} ${styles['username']} ${errors.updateErrors?.username || errors.updateErrors?.name ? styles['show'] : ''}`}>{errors.updateErrors?.username ? errors.updateErrors.username : ''}{errors.updateErrors?.name ? errors.updateErrors.name : ''}</p>
                            {editUsername ? 
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
                                            !group && (
                                                filteredUsernames.length > 0 &&
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
                                : (
                                    <>
                                        <h1 className={styles.username}>{group ? username || name : username}</h1> 
                                        {// Username is initially undefined for groups, but becomes defined once edited
                                        canEdit && 
                                            <img
                                                src={editLogo}
                                                alt='Edit logo'
                                                className={styles['edit-logo']}
                                                onClick={() => setEditUsername(!editUsername)}
                                                draggable='false'
                                            />}
                                    </>
                                )
                            }
                        </div>
                        
                        {group && chatData.name !== combinedGroupName && ( // Displays group members if they group name is not the default (a combination of the member's names)
                            <h2 className={styles['combined-group-name']}>{combinedGroupName}</h2>
                        )}

                        <div className={styles['bio-container']}>
                            <p className={`${styles['error']} ${styles['bio']} ${errors.updateErrors?.bio ? styles['show'] : ''}`}>{errors.updateErrors?.bio ? errors.updateErrors.bio : ''}</p>
                            {editBio ? (
                            <textarea 
                                type='text'
                                name='bio'
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                            />
                            ) : (
                            <>
                                <h3>{bio}</h3>
                                {canEdit && 
                                    <img
                                        src={editLogo}
                                        alt='Edit logo'
                                        className={styles['edit-logo']}
                                        onClick={() => setEditBio(!editBio)}
                                        draggable='false'
                                    />}
                            </>)}
                        </div>
                        <h5>{group ? 'Group' : 'User'} Created: {chatData.createdAtTime}, {chatData.createdAtDate}</h5>
                    </div>}
                    {(editProfilePic || editUsername || editBio) && (
                        <div className={styles['btns-container']}>
                            <div className={styles['edit-btns-container']}>
                                <button type='button' className={styles['cancel-edit']} onClick={cancelEdit}>Cancel</button>
                                <button type='button' className={styles['save-edit']} onClick={saveEdit}>Save</button>
                            </div>
                            <div className={styles['delete-btn-container']}>
                                <button type='button' className={styles['delete-profile']} onClick={deleteProfile}>Delete {group? 'group' : 'profile'}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserProfile;