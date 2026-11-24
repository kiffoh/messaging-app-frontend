import styles from './navbar.module.css'
import useAuth from '../../authentication/useAuth';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const messageIcon = 'https://res.cloudinary.com/dmaq0peyx/image/upload/v1727879837/messagingIcon_zjw84l.webp'

interface NavBarProps {
    /** Absent when rendered outside the chat shell (e.g. UserProfile). */
    onMessagesClick?: () => void;
}

function NavBar({ onMessagesClick }: NavBarProps) {
    const { user, signOut } = useAuth();
    const [profileLinks, setProfileLinks] = useState(false)
    const navigate = useNavigate();

    if (!user) return null;

    return (
        <div className={styles['navbar-body']}>
            <div className={styles['message-icon-container']}>
                <img src={messageIcon} alt='message logo' className={styles['message-logo']} draggable='false' />
            </div>
            <div className={styles.links}>
                <p className={styles['messages']} onClick={() => {
                    navigate('/');
                    onMessagesClick?.();
                }}>Messages</p>
                <div className={styles['profile-container']}>
                    <div className={styles[profileLinks ? 'image-container-highlighted' : 'image-container']}>
                        {user.photo && (
                            <img
                                src={user.photo}
                                alt='User Photo'
                                className={styles[profileLinks ? 'profile-picture-highlighted' : 'profile-picture']}
                                onClick={() => setProfileLinks(!profileLinks)}
                                draggable='false'
                            />
                        )}
                    </div>
                    {profileLinks && (
                        <div className={styles['profile-links']}>
                            <Link to={`/users/${user.id}/profile`}>Profile</Link>
                            <button type='button' className={styles['sign-out']} onClick={() => {
                                signOut();
                                navigate('/');
                            }}>Sign Out</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NavBar;
