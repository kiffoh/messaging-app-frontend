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
  // TODO(refactor F1): displayedChat is a copy of an item already in userChats. Holding
  // both means the same messages live in two places, kept equal by the two effects
  // below, which write into each other. Store the id and derive the chat instead.
  const [displayedChat, setDisplayedChat] = useState<Chat | null>(null);
  const [newChat, setNewChat] = useState(false); // State to toggle between chat and form
  // TODO(refactor F2): a pure function of displayedChat.members — should be useMemo.
  const [authorIdToPhotoURL, setAuthorIdToPhotoURL] = useState<AuthorPhotoMap>({})

  useEffect(() => {
    async function fetchUserMessages() {
      if (!user) return;
      try {
        // TODO(refactor F14): the backend can omit `messages`. Normalising here — with
        // `messages: chat.messages ?? []` — would remove the need for every downstream
        // guard, including the mismatched pair at the effect and the render below.
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

  // TODO(refactor F10): reads `user` and `setUser` but declares an empty dependency
  // array, so it captures the mount-time user forever.
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

  // TODO(refactor F11): which pane is visible is application state, but it is written
  // straight into the DOM here, fighting the media query that set it. React cannot see
  // the change, so nothing else can depend on it. `window.screen.width` is also the
  // physical display, not the viewport.
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
                // TODO(refactor F14): the same guard as effect A, written a second time.
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
