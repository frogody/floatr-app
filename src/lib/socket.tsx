'use client';

import { io, Socket } from 'socket.io-client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  senderId: string;
  sender: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  readBy: string[];
  isOwn: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (matchId: string, userId: string) => void;
  sendMessage: (matchId: string, content: string, messageType?: string) => void;
  markAsRead: (matchId: string, messageId: string) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  typingUsers: string[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    // Initialize Socket.IO client
    const newSocket = io(process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || '' 
      : 'http://localhost:3000', {
      path: '/api/socket',
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    // Chat event handlers
    newSocket.on('joined-chat', (data: { matchId: string; success: boolean }) => {
      console.log('Joined chat:', data);
    });

    newSocket.on('new-message', (message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('message-read', (data: { messageId: string; readBy: string }) => {
      console.log('Message read:', data);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, readBy: [...msg.readBy, data.readBy] }
            : msg
        )
      );
    });

    newSocket.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      console.log('User typing:', data);
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter(id => id !== data.userId);
        }
      });
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = (matchId: string, userId: string) => {
    if (socket && isConnected) {
      socket.emit('join-chat', { matchId, userId });
    }
  };

  const sendMessage = (matchId: string, content: string, messageType = 'TEXT') => {
    if (socket && isConnected && content.trim()) {
      socket.emit('send-message', { matchId, content: content.trim(), messageType });
    }
  };

  const markAsRead = (matchId: string, messageId: string) => {
    if (socket && isConnected) {
      socket.emit('mark-read', { matchId, messageId });
    }
  };

  const setTyping = (matchId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('typing', { matchId, isTyping });
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinChat,
    sendMessage,
    markAsRead,
    setTyping,
    messages,
    addMessage,
    clearMessages,
    typingUsers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for real-time messaging
export function useChat(matchId: string | null, userId: string | null) {
  const { socket, isConnected, joinChat, sendMessage, markAsRead, setTyping, messages, clearMessages } = useSocket();
  const [isInChat, setIsInChat] = useState(false);

  useEffect(() => {
    if (matchId && userId && isConnected && !isInChat) {
      joinChat(matchId, userId);
      setIsInChat(true);
    }

    return () => {
      if (isInChat) {
        clearMessages();
        setIsInChat(false);
      }
    };
  }, [matchId, userId, isConnected, joinChat, clearMessages, isInChat]);

  const send = (content: string, messageType = 'TEXT') => {
    if (matchId && content.trim()) {
      sendMessage(matchId, content, messageType);
    }
  };

  const markRead = (messageId: string) => {
    if (matchId) {
      markAsRead(matchId, messageId);
    }
  };

  const updateTyping = (isTyping: boolean) => {
    if (matchId) {
      setTyping(matchId, isTyping);
    }
  };

  return {
    isConnected,
    isInChat,
    messages,
    send,
    markRead,
    updateTyping,
  };
} 