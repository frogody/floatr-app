'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/lib/socket';
import { useUser } from '@clerk/nextjs';

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
  isFlagged?: boolean;
  toxicityScore?: number;
  moderationData?: any;
}

interface OtherBoat {
  id: string;
  name: string;
  type: string;
  currentVibe: string;
  images: string[];
  captain: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
}

interface ChatMessagesProps {
  matchId: string;
  messages: Message[];
  currentUserId: string;
  otherBoat: OtherBoat;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

export function ChatMessages({ matchId, messages: initialMessages, currentUserId, otherBoat }: ChatMessagesProps) {
  const [allMessages, setAllMessages] = useState<Message[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  
  // Use Socket.IO for real-time messaging
  const { isConnected, messages: realtimeMessages } = useChat(matchId, currentUserId);

  // Check if current user is a moderator (can be expanded based on roles)
  const isModerator = user?.publicMetadata?.role === 'moderator' || user?.publicMetadata?.isModerator;

  // Combine initial messages with real-time messages
  useEffect(() => {
    const combinedMessages = [...initialMessages, ...realtimeMessages];
    // Remove duplicates by ID
    const uniqueMessages = combinedMessages.filter((message, index, arr) => 
      arr.findIndex(m => m.id === message.id) === index
    );
    // Sort by creation time
    uniqueMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setAllMessages(uniqueMessages);
  }, [initialMessages, realtimeMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [allMessages]);

  // Group messages by date
  const messagesByDate = allMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (allMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="font-semibold text-gray-900 mb-2">Start the conversation!</h3>
          <p className="text-sm text-gray-500 mb-4">
            You&apos;ve matched with Captain {otherBoat.captain.firstName}. 
            Send a message to break the ice and plan your next maritime adventure!
          </p>
          <div className="text-xs text-gray-400">
            💡 Try: &quot;Ahoy! Great to match with another {otherBoat.type.toLowerCase()} captain!&quot;
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="h-full overflow-y-auto p-4 space-y-6 bg-gray-50"
    >
      {/* Connection Status */}
      {!isConnected && (
        <div className="text-center">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            ⚠️ Reconnecting...
          </Badge>
        </div>
      )}

      {Object.entries(messagesByDate).map(([date, messages]) => (
        <div key={date} className="space-y-2">
          {/* Date Separator */}
          <div className="flex items-center justify-center">
            <div className="bg-white px-3 py-1 rounded-full shadow-sm border text-xs text-gray-500">
              {formatDate(messages[0].createdAt)}
            </div>
          </div>

          {/* Messages for this date */}
          {messages.map((message, index) => {
            const isOwn = message.isOwn;
            const showAvatar = !isOwn && (
              index === 0 || 
              messages[index - 1]?.isOwn || 
              new Date(message.createdAt).getTime() - new Date(messages[index - 1]?.createdAt || 0).getTime() > 5 * 60 * 1000
            );

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar for other user's messages */}
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={otherBoat.captain.profileImage} />
                          <AvatarFallback className="text-xs">
                            {otherBoat.captain.firstName?.[0]}
                            {otherBoat.captain.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                      isOwn 
                        ? 'bg-blue-600 text-white rounded-br-md' 
                        : 'bg-white text-gray-900 rounded-bl-md border'
                    } ${
                      // Show red border for flagged messages (own messages or if moderator)
                      message.isFlagged && (isOwn || isModerator)
                        ? 'border-2 border-red-500 shadow-red-200' 
                        : ''
                    }`}
                  >
                    {/* Content Moderation Warning (for flagged messages) */}
                    {message.isFlagged && (isOwn || isModerator) && (
                      <div className="mb-2">
                        <Badge variant="destructive" className="text-xs">
                          🚨 Flagged Content
                          {message.toxicityScore && ` (${(message.toxicityScore * 100).toFixed(0)}% toxic)`}
                        </Badge>
                        {isModerator && message.moderationData && (
                          <div className="text-xs mt-1 opacity-75">
                            Detected: {message.moderationData.maxAttribute}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="break-words">
                      {message.messageType === 'TEXT' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <div className="text-sm">
                          <span className="opacity-75">📎 {message.messageType.toLowerCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Message Time */}
                    <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.createdAt)}
                      {isOwn && (
                        <span className="ml-1">
                          {message.readBy.length > 1 ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
} 