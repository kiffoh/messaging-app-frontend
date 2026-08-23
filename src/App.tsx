import { useEffect, useRef, useState } from 'react'
import './assets/styles/global.css'
import NavBar from './components/NavBar/NavBar'
import styles from './app.module.css'
import useAuth from './authentication/useAuth'
import axios from 'axios'
import ChatContainer from './components/ChatContainer/ChatContainer'
import { RiChatNewLine } from "react-icons/ri";
import type { AuthorPhotoMap, Chat, User } from './types';

const backendURL = import.meta.env.VITE_SERVER_URL;
const defaultPic = import.meta.env.VITE_DEFAULT_PICTURE;

function App() {
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useAuth();

  const [displayedChatId, setDisplayedChatId] = useState<number | null>(null);
  // TODO(refactor F1): when a new message arrives, how many places does it have to be
  // written to before the UI is consistent? What keeps them agreeing?
  const [displayedChat, setDisplayedChat] = useState<Chat | null>(null);
  const [newChat, setNewChat] = useState(false); // State to toggle between chat and form
  // TODO(refactor F2): what makes this map change? Could the answer be worked out at
  // render time from something we already have?
  const [authorIdToPhotoURL, setAuthorIdToPhotoURL] = useState<AuthorPhotoMap>({})

  useEffect(() => {
    async function fetchUserMessages() {
      if (!user) return;
      try {
        // TODO(refactor F14): the backend sometimes omits `messages` entirely. Where does
        // the code deal with that fact, and how many separate places?
        const response = await axios.get<Chat[]>(`${backendURL}/messages/${user.id}`);

        if (response.status === 200) {
          setUserChats(response.data);
        } else {
          setError("An error occurred when fetching the user's messages.")
        }
      } catch (err) {
        setError('An unknown error occurred.')
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchUserMessages();
  }, [user])

  // Effect A: copies the selected item out of userChats into displayedChat.
  useEffect(() => {
    if (userChats.length > 0 && displayedChatId === null) {
      const chatsWithMessages = userChats.filter(chat => chat.messages && chat.messages.length > 0);
      if (chatsWithMessages.length > 0) {
        setDisplayedChatId(chatsWithMessages[0].id);
      }
    }

    if (!displayedChat || displayedChat.id !== displayedChatId) {
      const selectedChat = userChats.find(chat => chat.id === displayedChatId); // Filter by chat ID
      setDisplayedChat(selectedChat ?? null); // Avoid setting undefined

      if (selectedChat) {
        const idToPhoto: AuthorPhotoMap = {};
        selectedChat.members.forEach(member => {
          idToPhoto[member.id] = member.photo ?? defaultPic;
        });
        setAuthorIdToPhotoURL(idToPhoto);
      }
    }
  }, [userChats, displayedChatId, displayedChat]);

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
        setError('An error occurred when updating the user.')
      }
    }
    if (user) updateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect B: copies displayedChat's messages back into userChats.
  // This updates the userChats when displayedChat is updated in child components
  useEffect(() => {
    if (displayedChat && displayedChatId) {
      setUserChats(prevChats =>
        prevChats.map(chat =>
          chat.id === displayedChatId
            ? { ...chat, messages: displayedChat.messages } // Only update the messages
            : chat
        )
      );
    }
  }, [displayedChat, displayedChatId]);

  // Tracks where the user has clicked in the Messages component (State for when to display the buttons to update/delete a message)
  // Abstracted to the App component so state can be set to false in instances greater than the Messages component
  const [userClick, setUserClick] = useState(false);

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
    <div className={styles['app-root']} onClick={() => setUserClick(false)}>
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
            {userChats.length > 0 ? (
              userChats
                // TODO(refactor F14): compare this guard with the one in effect A. Why do both exist?
                .filter(chat => (chat.messages?.length ?? 0) > 0) // Filter out chats with no messages
                .map((chat) => (
                  <div
                    className={styles[displayedChatId === chat.id ? 'user-chat-highlighted' : 'user-chat']}
                    key={chat.id}
                    onClick={() => {
                      setDisplayedChatId(chat.id);
                      toggleDisplayChange();
                    }}
                  >
                    <p className={styles['chat-name']}>{chat.name}</p>
                    <p className={styles['last-chat-message']}>{chat.messages?.[0]?.content}</p>
                  </div>
                ))
            ) : (
              <p>No chats available</p>
            )}
          </div>
        </div>
        <div className={styles['displayed-chat-container']} ref={displayedChatContainerDiv}>
          <ChatContainer
            user={user}
            displayedChat={displayedChat}
            setDisplayedChat={setDisplayedChat}
            newChat={newChat}
            setNewChat={setNewChat}
            userChats={userChats}
            setDisplayedChatId={setDisplayedChatId}
            setUserChats={setUserChats}
            authorIdToPhotoURL={authorIdToPhotoURL}
            setAuthorIdToPhotoURL={setAuthorIdToPhotoURL}
            userClick={userClick}
            setUserClick={setUserClick}
          />
        </div>
      </div>
    </div>
  )
}

export default App
