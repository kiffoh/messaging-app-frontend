import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const backendURL = import.meta.env.VITE_SERVER_URL;

  useEffect(() => {
    const socketInstance = io(`${backendURL}`);
    setSocket(socketInstance);

    // Clean up when the component unmounts
    return () => {
      socketInstance.disconnect();
    };
  }, [backendURL]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
