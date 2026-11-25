import {
    useState,
    useRef,
    useEffect,
    type FormEvent,
    type MouseEvent,
} from 'react';
import styles from '../displayedChat.module.css';
import { FaEdit } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import axios from 'axios';
import { api } from '../../../../api';
import { RxUpdate } from "react-icons/rx";
import { MdOutlineCancel } from "react-icons/md";
import formatDateTime from '../../../../functions/formatTimeDate';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../../authentication/useAuth';
import { photoMapFor } from '../../../../chats/chatsReducer';
import type { Chat, Message } from '../../../../types';

const defaultPic = import.meta.env.VITE_DEFAULT_PICTURE;

interface MessagesProps {
    displayedChat: Chat;
    setError: (message: string) => void;
}

function Messages({ displayedChat, setError }: MessagesProps) {
    const { user } = useAuth();
    const chatBodyRef = useRef<HTMLDivElement>(null); // Ref for the chat-body container
    const menuRef = useRef<HTMLDivElement>(null);
    // Position is relative to the chat-body, which the menu is absolutely positioned in.
    const [menu, setMenu] = useState<{ messageId: number; x: number; y: number } | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const navigate = useNavigate();

    const authorIdToPhotoURL = photoMapFor(displayedChat.members, defaultPic);

    useEffect(() => {
        if (menu === null) return;
        function closeOnOutsidePress(event: PointerEvent) {
            if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
        }
        document.addEventListener('pointerdown', closeOnOutsidePress);
        return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
    }, [menu]);

    const openProfile = (authorId: number | null) => {
        if (authorId !== null) navigate(`/users/${authorId}/profile`);
    };

    const avatarFor = (authorId: number | null) => (authorId !== null ? authorIdToPhotoURL[authorId] : defaultPic);

    const handleUserMessageClick = (event: MouseEvent<HTMLDivElement>, message: Message) => {
        const chatBodyRect = chatBodyRef.current?.getBoundingClientRect();
        if (!chatBodyRect) return;

        setMenu({
            messageId: message.id,
            x: event.clientX - chatBodyRect.left,
            y: event.clientY - chatBodyRect.top,
        });
    };

    const handleEditBtnClick = () => {
        if (!menu) return;
        setEditingId(menu.messageId);
        setDraft(displayedChat.messages.find(m => m.id === menu.messageId)?.content ?? '');
        setMenu(null);
    }

    const handleUpdateMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const target = displayedChat.messages.find(m => m.id === editingId);
        if (!target) return;

        if (target.content === draft) return;

        if (draft.trim() === '') return setError('The message cannot be empty.');

        try {
            // The server broadcasts the update; the chats reducer applies it.
            await api.put(`/groups/${displayedChat.id}/messages/${target.id}`, { content: draft });
            setEditingId(null);
        } catch (err) {
            setError(axios.isAxiosError(err) && err.response?.status === 403
                ? 'You can only change your own messages.'
                : 'An unknown error ocurred when trying to update the message.')
        }
    }

    const handleDeleteBtnClick = async () => {
        if (!menu) return;
        const { messageId } = menu;
        setMenu(null)

        try {
            await api.delete(`/groups/${displayedChat.id}/messages/${messageId}`)
        } catch (err) {
            setError(axios.isAxiosError(err) && err.response?.status === 403
                ? 'You can only change your own messages.'
                : 'An unknown error ocurred when trying to delete the message.')
        }
    }

    // Code for clicking on an image to enlarge it
    const [enlargeImage, setEnlargeImage] = useState<string | null>(null);

    const handleImageClick = (event: MouseEvent<HTMLImageElement>, url: string) => {
        event.stopPropagation()
        setEnlargeImage(url);
    };

    return (
        <div className={styles['chat-body']} ref={chatBodyRef}>
            {enlargeImage && (
                // Container for when an image is clicked on
                <div className={styles['enlarged-image-container']} onClick={() => setEnlargeImage(null)}>
                    <img src={enlargeImage} alt='Enlarged attachment' className={styles['enlarged-image']} />
                </div>
            )}
            {menu && (
                // Container to display the update/delete functionality for a message
                <div
                    ref={menuRef}
                    className={`${styles['update-delete-container']} ${styles['visible']}`}
                    style={{
                        top: `${menu.y}px`,
                        left: `${menu.x}px`,
                        position: 'absolute',
                    }}
                >
                    <button className={styles['edit-btn']} aria-label='Edit message' onClick={handleEditBtnClick}>
                        <FaEdit size={24} />
                    </button>
                    <button className={styles['delete-btn']} aria-label='Delete message' onClick={handleDeleteBtnClick}>
                        <MdDeleteForever size={24} />
                    </button>
                </div>
            )}
            {displayedChat.messages.map((message) => {
                const formattedDateTime = formatDateTime(message.updatedAt);
                const timestamp = message.createdAt === message.updatedAt
                    ? `${formattedDateTime.time}, ${formattedDateTime.date}`
                    : `Edited ${formattedDateTime.time}, ${formattedDateTime.date}`;

                return user && message.authorId === user.id ? (
                    <div key={message.id} className={styles['user-chat-container']}>
                        {message.id === editingId ? (
                            // Code when message is being edited
                            <form className={styles['update-message-form']} onSubmit={handleUpdateMessage}>
                                <button type='button' className={styles['cancel-message-btn']} aria-label='Cancel edit' onClick={() => setEditingId(null)}>
                                    <MdOutlineCancel size={24} />
                                </button>
                                <button type='submit' className={styles['update-message-btn']} aria-label='Save edit'>
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
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
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
                                {message.content ?? ''}
                                <div className={styles['user-message-timestamp']}>{timestamp}</div>
                            </div>
                        )}
                        <div className={styles['user-photo-container']}>
                            <img
                                src={avatarFor(message.authorId)}
                                alt="user-photo"
                                className={styles['user-photo']}
                                onClick={() => openProfile(message.authorId)}
                            />
                        </div>
                    </div>
                ) : (
                    <div key={message.id} className={styles['responder-chat-container']}>
                        <div className={styles['user-photo-container']}>
                            <img
                                src={avatarFor(message.authorId)}
                                alt="recipient-photo"
                                className={styles['recipient-photo']}
                                onClick={() => openProfile(message.authorId)}
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
                            {message.content ?? ''}
                            <div className={styles['responder-message-timestamp']}>{timestamp}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default Messages;
