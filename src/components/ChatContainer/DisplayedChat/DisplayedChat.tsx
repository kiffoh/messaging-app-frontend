import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import styles from './displayedChat.module.css'
import MessageInputForm from './MessageInputForm/MessageInputForm';
import Messages from './Messages/Messages';
import ProfileHeader from './ProfileHeader/ProfileHeader';
import type { AuthUser, AuthorPhotoMap, Chat } from '../../../types';

interface DisplayedChatProps {
    displayedChat: Chat;
    user: AuthUser;
    authorIdToPhotoURL: AuthorPhotoMap;
    setDisplayedChat: Dispatch<SetStateAction<Chat | null>>;
    setAuthorIdToPhotoURL: Dispatch<SetStateAction<AuthorPhotoMap>>;
    userClick: boolean;
    setUserClick: Dispatch<SetStateAction<boolean>>;
}

function DisplayedChat({
    displayedChat,
    user,
    authorIdToPhotoURL,
    setDisplayedChat,
    setAuthorIdToPhotoURL,
    userClick,
    setUserClick,
}: DisplayedChatProps) {
    const [error, setError] = useState<string | null>(null);

    // TODO(refactor F7): set an error and watch it. Does it ever clear? Trace exactly what
    // value this effect hands back to React.
    useEffect(() => {
        const timer = setTimeout(() => {
            setError(null)
        }, 2000)

        return clearTimeout(timer)
    }, [error])

    return (
        <div className={styles['chat-root']}>
            <ProfileHeader displayedChat={displayedChat} user={user} />
            <Messages
                displayedChat={displayedChat}
                user={user}
                authorIdToPhotoURL={authorIdToPhotoURL}
                setDisplayedChat={setDisplayedChat}
                setAuthorIdToPhotoURL={setAuthorIdToPhotoURL}
                setError={setError}
                userClick={userClick}
                setUserClick={setUserClick}
            />
            {error && <h3 className={styles['error']}>{error}</h3>}
            <MessageInputForm
                displayedChat={displayedChat}
                user={user}
                setError={setError}
                setDisplayedChat={setDisplayedChat}
            />
        </div>
    )
}

export default DisplayedChat;
