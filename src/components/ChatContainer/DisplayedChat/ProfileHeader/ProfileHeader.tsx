import styles from '../displayedChat.module.css'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, Chat } from '../../../../types';

interface ProfileHeaderProps {
    displayedChat: Chat;
    user: AuthUser;
}

function ProfileHeader({ displayedChat, user }: ProfileHeaderProps) {
    const [profileInformation, setProfileInformation] = useState<string | null>('select for contact info');
    const [fadeOut, setFadeOut] = useState(false); // Added state for fading

    const navigate = useNavigate();

    function displayGroupInfo() {
        if (displayedChat.members.length === 2) { // For direct message
            const recipient = displayedChat.members.find(member => member.id !== user.id);
            if (recipient) navigate(`/users/${recipient.id}/profile`);
        } else { // For groupChats
            navigate(`/groups/${displayedChat.id}/profile`);
        }
    }

    useEffect(() => {
        setProfileInformation('select for contact info')
        setFadeOut(false); // Reset fade state
        const timer = setTimeout(() => {
            setFadeOut(true); // Trigger fade-out effect
            setTimeout(() => setProfileInformation(null), 1000)
        }, 3000); // Time before fading starts

        return () => clearTimeout(timer); // Clean up timer on unmount
    }, [displayedChat])

    return (
        <div className={styles['chat-profile-container']}>
            <div className={styles['chat-header']} onClick={displayGroupInfo}>
                <img src={displayedChat.photo} alt='chat photo' className={styles['chat-photo']} draggable='false' />
                <div className={styles['chat-name-container']}>
                    <h2 className={styles['chat-name']}>{displayedChat.name}</h2>
                    {profileInformation && (
                        <p className={`${styles['profile-info']} ${fadeOut ? styles['fade-out'] : ''}`}>
                            {profileInformation}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProfileHeader;
