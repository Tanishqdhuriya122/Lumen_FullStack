import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './authcontext';
import { refreshAccessToken } from '../utils/axiosSetup';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) return;

        const socket = io(`${API_BASE}`, {
      // A function, so every (re)connect uses the latest token
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });

    // If the server rejects an expired token, refresh once and reconnect
    let retried = false;
    socket.on('connect', () => {
      retried = false;
    });
    socket.on('connect_error', async (err) => {
      if (!retried && /expired|invalid/i.test(err.message)) {
        retried = true;
        try {
          await refreshAccessToken();
          socket.connect();
        } catch {
          // Refresh failed. The next API call will send the user to /login.
        }
      }
    });

    socketRef.current = socket;

    socket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);