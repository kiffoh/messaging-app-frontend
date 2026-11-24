import { useEffect, useRef, useState } from 'react'
import './assets/styles/global.css'
import NavBar from './components/NavBar/NavBar'
import styles from './app.module.css'
import useAuth from './authentication/useAuth'
import axios from 'axios'
import ChatContainer from './components/ChatContainer/ChatContainer'
import { RiChatNewLine } from "react-icons/ri";
import { ChatsProvider } from './chats/ChatsContext';
import { useChats } from './chats/useChats';
import type { User } from './types';

const backendURL = import.meta.env.VITE_SERVER_URL;

function App() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <ChatsProvider userId={user.id}>
      <AppShell />
    </ChatsProvider>
  );
}

function AppShell() {
  const { chats, activeChat, selectChat, loading, error: chatsError } = useChats();
  const { user, setUser } = useAuth();
  const [profileError, setProfileError] = useState<string | null>(null);
  const error = chatsError ?? profileError;
  const [newChat, setNewChat] = useState(false); // State to toggle between chat and form

  // TODO(refactor F10): list the values this effect reads from the component. Now compare
  // that list with its dependency array.
  useEffect(() => {
    async function updateUser() {
      if (!user || !user.id) return;

      try {
        const response = await axios.get<User>(`${backendURL}/users/${user.id}/profile`);
        if (response.status === 200) {
          setUser(response.data);
        }
      } catch (err) {
        setProfileError('An error occurred when updating the user.')
      }
    }
    if (user) updateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Used for css styling with mobile screens (Specifically max-screen: 550px)
  // Not enough screen space for both elements to be displayed, so will be programmatically switched between
  const userChatsContainer = useRef<HTMLDivElement>(null);
  const chatBarDiv = useRef<HTMLDivElement>(null);
  const displayedChatContainerDiv = useRef<HTMLDivElement>(null);
  const appBodyDiv = useRef<HTMLDivElement>(null);

  // TODO(refactor F11): after this function runs, does React know which pane is showing?
  // What would have to be true for another component to react to that change?
  // Separately: what does window.screen.width measure?
  const toggleDisplayChange = () => {
    if (window.screen.width > 550) return;
    if (!chatBarDiv.current || !displayedChatContainerDiv.current) return;

    if (window.getComputedStyle(chatBarDiv.current).display === 'none') {
      chatBarDiv.current.style.display = 'grid';
      displayedChatContainerDiv.current.style.display = 'none';
    } else if (window.getComputedStyle(displayedChatContainerDiv.current).display === 'none') {
      chatBarDiv.current.style.display = 'none';
      displayedChatContainerDiv.current.style.display = 'block';
    }
  }

  if (loading) return <h1>Loading... </h1>
  if (!user) return null;

  return (
    <div className={styles['app-root']}>
      <NavBar toggleDisplayChange={toggleDisplayChange} />
      <div className={styles['app-body']} ref={appBodyDiv}>
        <div className={styles['chat-bar']} ref={chatBarDiv}>
          <div className={styles['chat-title-container']}>
            <h2 className={styles['chat-title']}>Chats</h2>
            {error && <h3 className={styles['error']}>{error}</h3>}
            <button className={styles['new-chat-btn']} onClick={() => {
              setNewChat(true);
              toggleDisplayChange();
            }}>
              <RiChatNewLine size={24} />
            </button>
          </div>
          <div className={styles['user-chats-container']} ref={userChatsContainer}>
            {chats.length > 0 ? (
              chats
                .filter(chat => chat.messages.length > 0) // Filter out chats with no messages
                .map((chat) => (
                  <div
                    className={styles[activeChat?.id === chat.id ? 'user-chat-highlighted' : 'user-chat']}
                    key={chat.id}
                    onClick={() => {
                      selectChat(chat.id);
                      toggleDisplayChange();
                    }}
                  >
                    <p className={styles['chat-name']}>{chat.name}</p>
                    <p className={styles['last-chat-message']}>{chat.messages[0]?.content}</p>
                  </div>
                ))
            ) : (
              <p>No chats available</p>
            )}
          </div>
        </div>
        <div className={styles['displayed-chat-container']} ref={displayedChatContainerDiv}>
          <ChatContainer newChat={newChat} onClose={() => setNewChat(false)} />
        </div>
      </div>
    </div>
  )
}

export default App
