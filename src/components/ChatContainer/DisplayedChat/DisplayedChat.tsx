import styles from './displayedChat.module.css'
import MessageInputForm from './MessageInputForm/MessageInputForm';
import Messages from './Messages/Messages';
import ProfileHeader from './ProfileHeader/ProfileHeader';
import useAutoClearingState from '../../../hooks/useAutoClearingState';
import type { Chat } from '../../../types';

function DisplayedChat({ displayedChat }: { displayedChat: Chat }) {
    const [error, setError] = useAutoClearingState<string>(2000);

    return (
        <div className={styles['chat-root']}>
            <ProfileHeader displayedChat={displayedChat} />
            <Messages displayedChat={displayedChat} setError={setError} />
            {error && <h3 className={styles['error']}>{error}</h3>}
            <MessageInputForm displayedChat={displayedChat} setError={setError} />
        </div>
    )
}

export default DisplayedChat;
