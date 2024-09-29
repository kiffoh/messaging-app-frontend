import styles from './displayedChat.module.css'
import { useEffect, useState } from 'react';
import axios from 'axios';
import { MdAttachFile } from "react-icons/md";
import { IoIosSend } from "react-icons/io";
import { useSocket } from '../socketContext/useSocket';

const backendURL = import.meta.env.VITE_SERVER_URL;

function MessageInputForm({displayedChat, user, setDisplayedChat}) {
    const socket = useSocket();
    const [message, setMessage] = useState('');
    const [error, setError] = useState(false);
    
    async function sendMessage(event) {
        event.preventDefault();

        if (message.trim() === '') return;

        try {
            const response = await axios.post(`${backendURL}/messages/${displayedChat.id}`, {
                content: message,
                groupId: displayedChat.id,
                authorId: user.id
            });

            console.log(displayedChat)
            console.log(response)
    
            // Check if the response is successful
            if (response.status === 201 || response.status === 200) {
                // Handle successful response
                socket.emit("newMessage", response.data)
                setMessage('');
            } else {
                setError('An error occurred when trying to send the message.');
            }
        } catch (err) {
            // Log error for debugging purposes
            console.error('Error sending message:', err);
            setError('An unknown error occurred.');
        }
    }

    useEffect(() => {
        socket.on("newMessage", (newMessage) => {
            setDisplayedChat((prevChat) => ({
                ...prevChat,
                messages: [...prevChat.messages, newMessage], // Ensure you're appending the new message correctly
            }));
        });
    
        return () => {
            socket.off("newMessage"); // Clean up listener when component unmounts
        };
    }, [socket]);    

    return (
        <div className={styles['messaging-container']}>
            <form onSubmit={sendMessage} className={styles['message-container']}>
                <div className={styles['attach-btn-container']}>
                    <button type='button' className={styles['attach-btn']}>
                        <MdAttachFile size={24}/>
                    </button>
                </div>
                <textarea
                    className={styles['message-box']}
                    name='message'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className={styles['send-btn-container']}>
                    <button type='submit' className={styles['send-btn']}>
                        <IoIosSend size={24}/>
                    </button>
                </div>
            </form>
        </div>
    )
}

export default MessageInputForm;