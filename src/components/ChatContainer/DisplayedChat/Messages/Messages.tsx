import {
    useState,
    useRef,
    useEffect,
    type Dispatch,
    type FormEvent,
    type MouseEvent,
    type SetStateAction,
} from 'react';
import styles from '../displayedChat.module.css';
import { FaEdit } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import axios from 'axios';
import { RxUpdate } from "react-icons/rx";
import { MdOutlineCancel } from "react-icons/md";
import { useSocket } from '../../../../socketContext/useSocket';
import formatDateTime from '../../../../functions/formatTimeDate';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, AuthorPhotoMap, Chat, Message } from '../../../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;
const defaultPic = import.meta.env.VITE_DEFAULT_PICTURE;

interface MessagesProps {
    displayedChat: Chat;
    authorIdToPhotoURL: AuthorPhotoMap;
    user: AuthUser;
    setDisplayedChat: Dispatch<SetStateAction<Chat | null>>;
    setAuthorIdToPhotoURL: Dispatch<SetStateAction<AuthorPhotoMap>>;
    setError: Dispatch<SetStateAction<string | null>>;
    userClick: boolean;
    setUserClick: Dispatch<SetStateAction<boolean>>;
}

function Messages({
    displayedChat,
    authorIdToPhotoURL,
    user,
    setDisplayedChat,
    setAuthorIdToPhotoURL,
    setError,
    setUserClick,
    userClick,
}: MessagesProps) {
    const socket = useSocket();
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const chatBodyRef = useRef<HTMLDivElement>(null); // Ref for the chat-body container

    // TODO(refactor F12): this is a ref, but the render below branches on
    // clickedMessage.current?.id. Refs do not trigger re-renders — this only works
    // because setEditMsg happens in the same handler. A single `editingMessageId` state
    // replaces both this and `editMsg`.
    const clickedMessage = useRef<Message | null>(null);
    const [editMsg, setEditMsg] = useState(false);
    const [updatedMessage, setUpdatedMessage] = useState('');
    const navigate = useNavigate();

    const handleUserMessageClick = (event: MouseEvent<HTMLDivElement>, message: Message) => {
        event.stopPropagation(); // Stop click from propagating to parent

        // Get the position of the chat-body container relative to the viewport
        const chatBodyRect = chatBodyRef.current?.getBoundingClientRect();
        if (!chatBodyRect) return;

        // Adjust the position relative to the chat-body container
        const relativeX = event.clientX - chatBodyRect.left;
        const relativeY = event.clientY - chatBodyRect.top;

        setUserClick(true);
        clickedMessage.current = message;

        // Update the coordinates based on the click position relative to chat-body
        setCoords({ x: relativeX, y: relativeY });
    };

    const handleEditBtnClick = () => {
        setUserClick(false)
        setEditMsg(true);
        setUpdatedMessage(clickedMessage.current?.content ?? '')
    }

    const handleUpdateMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const target = clickedMessage.current;
        if (!target) return;

        if (target.content === updatedMessage) return;

        if (updatedMessage.trim() === '') return setError('The message cannot be empty.');

        try {
            const response = await axios.put<Message>(
                `${backendURL}/messages/${displayedChat.id}/${target.id}`,
                { content: updatedMessage }
            )

            if (response.status === 200) {
                socket?.emit('messageUpdated', response.data);
            }

            setEditMsg(false);
        } catch (err) {
            setError('An unknown error ocurred when trying to update the message.')
        }
    }

    const handleDeleteBtnClick = async () => {
        const target = clickedMessage.current;
        if (!target) return setError('The message could not be deleted. Please try again.')

        setUserClick(false)

        try {
            const response = await axios.delete(`${backendURL}/messages/${displayedChat.id}/${target.id}`)

            if (response.status === 200) {
                socket?.emit('messageDeleted', target.id)
            }
        } catch (err) {
            setError('An unknown error ocurred when trying to delete the message.')
        }
    }

    // TODO(refactor F8/F9): both cleanups drop every listener for the event, not just
    // these. Both handlers also write through setDisplayedChat, so edits and deletions
    // in a chat that is not currently open are silently discarded.
    useEffect(() => {
        if (!socket) return;

        const onUpdated = (updated: Message) => {
            setDisplayedChat((prevChat) => prevChat && ({
                ...prevChat,
                messages: (prevChat.messages ?? []).map((msg) =>
                    msg.id === updated.id ? updated : msg
                ),
            }));
        };

        const onDeleted = (deletedMessageId: number) => {
            setDisplayedChat((prevChat) => prevChat && ({
                ...prevChat,
                messages: (prevChat.messages ?? []).filter((msg) => msg.id !== deletedMessageId),
            }));
        };

        socket.on('messageUpdated', onUpdated);
        socket.on('messageDeleted', onDeleted);

        return () => {
            socket.off('messageUpdated');
            socket.off('messageDeleted');
        };
    }, [socket, setDisplayedChat]);

    // Code for clicking on an image to enlarge it
    const [enlargeImage, setEnlargeImage] = useState<string | null>(null);

    const handleImageClick = (event: MouseEvent<HTMLImageElement>, url: string) => {
        event.stopPropagation()
        setEnlargeImage(url);
    };

    // TODO(refactor F2): this effect exists to repair authorIdToPhotoURL when App failed
    // to build it (the messages request returns an empty object on signup). The map is a
    // pure function of displayedChat.members — deriving it removes this effect, the
    // setter prop, and the edge case together.
    useEffect(() => {
        if (Object.keys(authorIdToPhotoURL).length === 0) {
            const idToPhoto: AuthorPhotoMap = {};
            displayedChat.members.forEach(member => {
                idToPhoto[member.id] = member.photo ?? defaultPic;
            });
            setAuthorIdToPhotoURL(idToPhoto);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayedChat])

    return (
        <div className={styles['chat-body']} ref={chatBodyRef} onClick={() => setUserClick(false)}>
            {enlargeImage && (
                // Container for when an image is clicked on
                <div className={styles['enlarged-image-container']} onClick={() => setEnlargeImage(null)}>
                    <img src={enlargeImage} alt='Enlarged attachment' className={styles['enlarged-image']} />
                </div>
            )}
            {userClick && (
                // Container to display the update/delete functionality for a message
                <div
                    className={`${styles['update-delete-container']} ${styles['visible']}`}
                    style={{
                        top: `${coords.y}px`,
                        left: `${coords.x}px`,
                        position: 'absolute',
                    }}
                >
                    <button className={styles['edit-btn']} onClick={handleEditBtnClick}>
                        <FaEdit size={24} />
                    </button>
                    <button className={styles['delete-btn']} onClick={handleDeleteBtnClick}>
                        <MdDeleteForever size={24} />
                    </button>
                </div>
            )}
            {(displayedChat.messages ?? []).map((message) => {
                const formattedDateTime = formatDateTime(message.updatedAt);
                const timestamp = message.createdAt === message.updatedAt
                    ? `${formattedDateTime.time}, ${formattedDateTime.date}`
                    : `Edited ${formattedDateTime.time}, ${formattedDateTime.date}`;

                return message.authorId === user.id ? (
                    <div key={message.id} className={styles['user-chat-container']}>
                        {editMsg && message.id === clickedMessage.current?.id ? (
                            // Code when message is being edited
                            <form className={styles['update-message-form']} onSubmit={handleUpdateMessage}>
                                <button type='button' className={styles['cancel-message-btn']} onClick={() => setEditMsg(false)}>
                                    <MdOutlineCancel size={24} />
                                </button>
                                <button type='submit' className={styles['update-message-btn']}>
                                    <RxUpdate size={24} />
                                </button>
                                <div className={styles['user-chat']}>
                                    {message.photoUrl && (
                                        <img
                                            src={message.photoUrl}
                                            alt='User photo'
                                            className={styles['user-photo-message']}
                                            onClick={(event) => handleImageClick(event, message.photoUrl!)}
                                        />
                                    )}
                                    <textarea
                                        className={styles['update-message-box']}
                                        name='message'
                                        value={updatedMessage}
                                        onChange={(e) => setUpdatedMessage(e.target.value)}
                                    />
                                </div>
                            </form>
                        ) : (
                            // Code to display the messages
                            <div
                                className={styles['user-chat']}
                                onClick={(event) => handleUserMessageClick(event, message)}
                            >
                                {message.photoUrl && (
                                    <img
                                        src={message.photoUrl}
                                        alt='User photo'
                                        className={styles['user-photo-message']}
                                        onClick={(event) => handleImageClick(event, message.photoUrl!)}
                                    />
                                )}
                                {message.content}
                                <div className={styles['user-message-timestamp']}>{timestamp}</div>
                            </div>
                        )}
                        <div className={styles['user-photo-container']}>
                            <img
                                src={authorIdToPhotoURL[message.authorId]}
                                alt="user-photo"
                                className={styles['user-photo']}
                                onClick={() => navigate(`/users/${message.authorId}/profile`)}
                            />
                        </div>
                    </div>
                ) : (
                    <div key={message.id} className={styles['responder-chat-container']}>
                        <div className={styles['user-photo-container']}>
                            <img
                                src={authorIdToPhotoURL[message.authorId]}
                                alt="recipient-photo"
                                className={styles['recipient-photo']}
                                onClick={() => navigate(`/users/${message.authorId}/profile`)}
                            />
                        </div>
                        <div className={styles['responder-chat']}>
                            {message.photoUrl && (
                                <img
                                    src={message.photoUrl}
                                    alt='Responder photo'
                                    className={styles['responder-photo-message']}
                                    onClick={(event) => handleImageClick(event, message.photoUrl!)}
                                />
                            )}
                            {message.content}
                            <div className={styles['responder-message-timestamp']}>{timestamp}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default Messages;
