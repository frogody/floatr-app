'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/lib/socket';

interface MessageInputProps {
  matchId: string;
  currentUserId: string;
  disabled?: boolean;
}

export function MessageInput({ matchId, currentUserId, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isConnected, send, updateTyping, typingUsers } = useChat(matchId, currentUserId);

  // Handle typing indicators
  const handleInputChange = (value: string) => {
    setMessage(value);

    // Start typing indicator if not already typing
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      updateTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTyping(false);
      }
    }, 2000);
  };

  // Handle message send
  const handleSend = async () => {
    const content = message.trim();
    if (!content || disabled || !isConnected) return;

    try {
      // Clear the input immediately for better UX
      setMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        updateTyping(false);
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send message via WebSocket
      send(content, 'TEXT');

      // Fallback: Also send via HTTP API for reliability
      await fetch(`/api/matches/${matchId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          messageType: 'TEXT',
        }),
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message in input if sending failed
      setMessage(content);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Show other user typing indicator
  const otherUserTyping = typingUsers.filter(userId => userId !== currentUserId).length > 0;

  return (
    <div className="space-y-2">
      {/* Typing Indicator */}
      {otherUserTyping && (
        <div className="text-xs text-gray-500 px-3">
          <div className="flex items-center space-x-1">
            <span>Captain is typing</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Chat is disabled" : "Type a message..."}
            disabled={disabled}
            className="pr-12 bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            maxLength={1000}
          />
          
          {/* Character counter (shown when approaching limit) */}
          {message.length > 800 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              {1000 - message.length}
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || !isConnected}
          size="default"
          className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
        >
          {!isConnected ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>•••</span>
            </div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="text-xs text-red-500 px-3">
          ⚠️ Connection lost. Messages will be sent when reconnected.
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-400 px-3">
        💡 Press Enter to send • Shift+Enter for new line
      </div>
    </div>
  );
} 