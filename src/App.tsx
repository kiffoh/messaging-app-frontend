import { useState } from 'react'
import './assets/styles/global.css'
import NavBar from './components/NavBar/NavBar'
import styles from './app.module.css'
import useAuth from './authentication/useAuth'
import ChatContainer from './components/ChatContainer/ChatContainer'
import { RiChatNewLine } from "react-icons/ri";
import { ChatsProvider } from './chats/ChatsContext';
import { useChats } from './chats/useChats';
import useMediaQuery from './hooks/useMediaQuery';

function App() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <ChatsProvider key={user.id} userId={user.id}>
      <AppShell />
    </ChatsProvider>
  );
}

function AppShell() {
  const { chats, activeChat, selectChat, loading, error } = useChats();
  const [newChat, setNewChat] = useState(false);

  // Below 550px there is room for only one pane at a time
  const isMobile = useMediaQuery('(max-width: 550px)');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const hide = (pane: 'list' | 'chat') => (isMobile && mobilePane !== pane ? ` ${styles['pane-hidden']}` : '');

  if (loading) return <h1>Loading... </h1>
  return (
    <div className={styles['app-root']}>
      <NavBar onMessagesClick={() => setMobilePane('list')} />
      <div className={styles['app-body']}>
        <div className={styles['chat-bar'] + hide('list')}>
          <div className={styles['chat-title-container']}>
            <h2 className={styles['chat-title']}>Chats</h2>
            {error && <h3 className={styles['error']}>{error}</h3>}
            <button className={styles['new-chat-btn']} aria-label='New chat' onClick={() => {
              setNewChat(true);
              setMobilePane('chat');
            }}>
              <RiChatNewLine size={24} />
            </button>
          </div>
          <div className={styles['user-chats-container']}>
            {chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  className={styles[activeChat?.id === chat.id ? 'user-chat-highlighted' : 'user-chat']}
                  key={chat.id}
                  onClick={() => {
                    selectChat(chat.id);
                    setMobilePane('chat');
                  }}
                >
                  <p className={styles['chat-name']}>{chat.name}</p>
                  <p className={styles['last-chat-message']}>{chat.messages[0]?.content ?? ''}</p>
                </div>
              ))
            ) : (
              <p>No chats available</p>
            )}
          </div>
        </div>
        <div className={styles['displayed-chat-container'] + hide('chat')}>
          <ChatContainer newChat={newChat} onClose={() => setNewChat(false)} />
        </div>
      </div>
    </div>
  )
}

export default App
