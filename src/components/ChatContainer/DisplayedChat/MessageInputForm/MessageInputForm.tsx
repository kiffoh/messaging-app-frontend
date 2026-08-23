import styles from '../displayedChat.module.css'
import {
    useEffect,
    useState,
    useRef,
    type ChangeEvent,
    type Dispatch,
    type FormEvent,
    type SetStateAction,
} from 'react';
import axios from 'axios';
import { MdAttachFile } from "react-icons/md";
import { IoIosSend } from "react-icons/io";
import { useSocket } from '../../../../socketContext/useSocket';
import type { AuthUser, Chat, Message } from '../../../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;

interface MessageInputFormProps {
    displayedChat: Chat;
    user: AuthUser;
    setDisplayedChat: Dispatch<SetStateAction<Chat | null>>;
    setError: Dispatch<SetStateAction<string | null>>;
}

function MessageInputForm({ displayedChat, user, setDisplayedChat, setError }: MessageInputFormProps) {
    const socket = useSocket();
    const [message, setMessage] = useState('');

    /* Code for sending files */
    const [file, setFile] = useState<File | null>(null); // State to store the selected file
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (message.trim() === '' && file === null) return setError('Please provide a valid message.')

        try {
            const formData = new FormData();
            if (message) {
                formData.append('content', message);
            }
            formData.append('groupId', String(displayedChat.id));
            formData.append('authorId', String(user.id));

            if (file) {
                formData.append('photoUrl', file); // Append the file only if one is selected
            }

            const response = await axios.post<Message>(`${backendURL}/messages/${displayedChat.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Check if the response is successful
            if (response.status === 201 || response.status === 200) {
                // Handle successful response
                socket?.emit("newMessage", response.data)
                setMessage('');
                setFile(null);
            } else {
                setError('An error occurred when trying to send the message.');
            }
        } catch (err) {
            setError('An unknown error occurred.');
        }
    }

    // TODO(refactor F8/F9): `socket` is null on the first commit, and the cleanup below
    // removes every listener for "newMessage" rather than just this one. The handler also
    // writes through setDisplayedChat, so a message arriving for a chat that is not open
    // is silently dropped.
    useEffect(() => {
        if (!socket) return;

        socket.on("newMessage", (newMessage: Message) => {
            setDisplayedChat((prevChat) => prevChat && ({
                ...prevChat,
                messages: [newMessage, ...(prevChat.messages ?? [])],
            }));
        });

        return () => {
            socket.off("newMessage"); // Clean up listener when component unmounts
        };
    }, [socket, setDisplayedChat]);

    const handleFileInputClick = () => {
        fileInputRef.current?.click(); // Trigger the hidden file input when button is clicked
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile); // Set the selected file in state
        }
    };

    return (
        <div className={styles['messaging-container']}>
            <form onSubmit={sendMessage} className={styles['message-container']}>
                <div className={styles['attach-btn-container']}>
                    <button
                        type='button'
                        className={styles['attach-btn']}
                        onClick={handleFileInputClick}
                    >
                        <MdAttachFile size={24} />
                    </button>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef} // Reference to the file input
                        style={{ display: 'none' }} // Hide it visually
                        onChange={handleFileChange} // Trigger when a file is selected
                    />

                    {/* Display selected file name */}
                    {file && (
                        <div className={styles['file-info']}>
                            <p>Selected file: {file.name}</p>
                        </div>
                    )}
                </div>
                <textarea
                    className={styles['message-box']}
                    name='message'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    aria-label="Message"
                />
                <div className={styles['send-btn-container']}>
                    <button type='submit' className={styles['send-btn']}>
                        <IoIosSend size={24} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default MessageInputForm;
