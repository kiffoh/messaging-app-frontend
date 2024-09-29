import { useState } from 'react';
import styles from './displayedChat.module.css'
import MessageInputForm from './MessageInputForm';
import Messages from './Messages';
import ProfileHeader from './ProfileHeader';


function DisplayedChat({displayedChat, user, authorIdToPhotoURL, setDisplayedChat}) {
    
    const [error, setError] = useState(null);


    return (
        <div className={styles['chat-root']}>
            <ProfileHeader displayedChat={displayedChat} user={user} />
            <Messages displayedChat={displayedChat} user={user} authorIdToPhotoURL={authorIdToPhotoURL} setDisplayedChat={setDisplayedChat}/>
            <MessageInputForm displayedChat={displayedChat} user={user} setDisplayedChat={setDisplayedChat}/>
        </div>
    )
}

export default DisplayedChat;
