import styles from '../displayedChat.module.css'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../../authentication/useAuth';
import type { Chat } from '../../../../types';

function ProfileHeader({ displayedChat }: { displayedChat: Chat }) {
    const { user } = useAuth();
    const [profileInformation, setProfileInformation] = useState<string | null>('select for contact info');
    const [fadeOut, setFadeOut] = useState(false); // Added state for fading

    const navigate = useNavigate();

    function displayGroupInfo() {
        if (displayedChat.members.length === 2) { // For direct message
            const recipient = displayedChat.members.find(member => member.id !== user?.id);
            if (recipient) navigate(`/users/${recipient.id}/profile`);
        } else { // For groupChats
            navigate(`/groups/${displayedChat.id}/profile`);
        }
    }

    useEffect(() => {
        let hideTimer: ReturnType<typeof setTimeout>;
        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
            hideTimer = setTimeout(() => setProfileInformation(null), 1000);
        }, 3000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, [])

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
