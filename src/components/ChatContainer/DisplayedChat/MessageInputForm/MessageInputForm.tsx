import styles from '../displayedChat.module.css'
import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../../../../api';
import { MdAttachFile } from "react-icons/md";
import { IoIosSend } from "react-icons/io";
import useAuth from '../../../../authentication/useAuth';
import type { Chat } from '../../../../types';

interface MessageInputFormProps {
    displayedChat: Chat;
    setError: (message: string) => void;
}

function MessageInputForm({ displayedChat, setError }: MessageInputFormProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');

    /* Code for sending files */
    const [file, setFile] = useState<File | null>(null); // State to store the selected file
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!user) return;
        if (message.trim() === '' && file === null) return setError('Please provide a valid message.')

        try {
            const formData = new FormData();
            if (message) {
                formData.append('content', message);
            }

            if (file) {
                formData.append('photo', file); // Append the file only if one is selected
            }

            await api.post(`/groups/${displayedChat.id}/messages`, formData);

            // The server broadcasts the new message to every client, including this one.
            setMessage('');
            setFile(null);
        } catch (err) {
            setError('An unknown error occurred.');
        }
    }

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
                        aria-label='Attach file'
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
                    <button type='submit' className={styles['send-btn']} aria-label='Send message'>
                        <IoIosSend size={24} />
                    </button>
                </div>
            </form>
        </div>
    )
}

export default MessageInputForm;
