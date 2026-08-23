import styles from './navbar.module.css'
import useAuth from '../../authentication/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const messageIcon = 'https://res.cloudinary.com/dmaq0peyx/image/upload/v1727879837/messagingIcon_zjw84l.webp'

interface NavBarProps {
    /** Absent when rendered outside the chat shell (e.g. UserProfile). */
    toggleDisplayChange?: () => void;
}

function NavBar({ toggleDisplayChange }: NavBarProps) {
    const { user } = useAuth();
    // TODO(refactor F5): userId and userPhoto are copies of values already on `user`, so
    // this bar always renders one frame behind the context. Read `user` directly instead.
    const [userId, setUserId] = useState<number | null>(null);
    const [userPhoto, setUserPhoto] = useState<string | null>('');
    const [profileLinks, setProfileLinks] = useState(false)
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setUserId(user.id);
            setUserPhoto(user.photo);
        }
    }, [user])

    return (
        <div className={styles['navbar-body']}>
            <div className={styles['message-icon-container']}>
                <img src={messageIcon} alt='message logo' className={styles['message-logo']} draggable='false' />
            </div>
            <div className={styles.links}>
                <p className={styles['messages']} onClick={() => {
                    navigate('/');
                    toggleDisplayChange?.();
                }}>Messages</p>
                <div className={styles['profile-container']}>
                    <div className={styles[profileLinks ? 'image-container-highlighted' : 'image-container']}>
                        {userPhoto && (
                            <img
                                src={userPhoto}
                                alt='User Photo'
                                className={styles[profileLinks ? 'profile-picture-highlighted' : 'profile-picture']}
                                onClick={() => setProfileLinks(!profileLinks)}
                                draggable='false'
                            />
                        )}
                    </div>
                    {profileLinks && (
                        // TODO(refactor F15): these are raw <a> tags, so navigating forces a
                        // full page reload. That reload is currently what re-establishes auth
                        // state across the separate AuthProvider instances — switching to
                        // <Link> requires fixing the provider tree first.
                        <div className={styles['profile-links']}>
                            <a href={`/users/${userId}/profile`}>Profile</a>
                            <a href='/users/signout'>Sign Out</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NavBar;
