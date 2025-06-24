'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Conversation {
  matchId: string;
  chatRoomId: string | null;
  matchedAt: string;
  lastMessageAt: string;
  isActive: boolean;
  unreadCount: number;
  userBoat: {
    id: string;
    name: string;
    type: string;
    currentVibe: string;
    images: string[];
  };
  otherBoat: {
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
  };
  latestMessage: {
    id: string;
    content: string;
    messageType: string;
    createdAt: string;
    senderId: string;
    sender: {
      firstName?: string;
      lastName?: string;
    };
    isOwn: boolean;
  } | null;
}

interface ConversationsData {
  conversations: Conversation[];
  totalConversations: number;
  totalUnreadMessages: number;
}

const getVibeEmoji = (vibe: string) => {
  const emojiMap: { [key: string]: string } = {
    PARTY: '🥂',
    CHILL: '⛵',
    PRIVATE: '🔒',
    FAMILY: '👨‍👩‍👧‍👦',
    ADVENTURE: '🗺️',
  };
  return emojiMap[vibe] || '⚓';
};

const getBoatTypeEmoji = (type: string) => {
  const emojiMap: { [key: string]: string } = {
    SAILBOAT: '⛵',
    MOTORBOAT: '🚤',
    YACHT: '🛥️',
    CATAMARAN: '⛵',
    SPEEDBOAT: '💨',
    OTHER: '🚢',
  };
  return emojiMap[type] || '🚢';
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }
};

const truncateMessage = (content: string, maxLength = 60) => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

export function ConversationsList() {
  const [conversations, setConversations] = useState<ConversationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.data);

    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading your conversations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-4">😕</div>
              <h3 className="font-semibold mb-2">Oops!</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchConversations} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No conversations state
  if (!conversations || conversations.conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-semibold mb-2">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by matching with other boats to begin conversations!
              </p>
              <Link href="/dashboard/discover">
                <Button className="w-full">
                  🧭 Discover Boats
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {conversations.totalConversations}
              </div>
              <div className="text-sm text-gray-600">Active Conversations</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {conversations.totalUnreadMessages}
              </div>
              <div className="text-sm text-gray-600">Unread Messages</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {conversations.conversations.filter(c => c.latestMessage && 
                  new Date(c.lastMessageAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ).length}
              </div>
              <div className="text-sm text-gray-600">Active Today</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Recent Conversations</h2>
        
        {conversations.conversations.map((conversation) => (
          <Link 
            key={conversation.matchId} 
            href={`/dashboard/messages/${conversation.matchId}`}
          >
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Other Boat Image */}
                  <div className="relative">
                    {conversation.otherBoat.images.length > 0 ? (
                      <img
                        src={conversation.otherBoat.images[0]}
                        alt={conversation.otherBoat.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                        {getBoatTypeEmoji(conversation.otherBoat.type)}
                      </div>
                    )}
                    {/* Vibe indicator */}
                    <div className="absolute -top-1 -right-1 text-lg">
                      {getVibeEmoji(conversation.otherBoat.currentVibe)}
                    </div>
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {getBoatTypeEmoji(conversation.otherBoat.type)} {conversation.otherBoat.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>

                    {/* Captain Info */}
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={conversation.otherBoat.captain.profileImage} />
                        <AvatarFallback className="text-xs">
                          {conversation.otherBoat.captain.firstName?.[0]}
                          {conversation.otherBoat.captain.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        Captain {conversation.otherBoat.captain.firstName} {conversation.otherBoat.captain.lastName}
                      </span>
                    </div>

                    {/* Latest Message */}
                    {conversation.latestMessage ? (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">
                          {conversation.latestMessage.isOwn ? 'You: ' : `${conversation.latestMessage.sender.firstName}: `}
                        </span>
                        <span className={conversation.unreadCount > 0 && !conversation.latestMessage.isOwn ? 'font-medium text-gray-900' : ''}>
                          {conversation.latestMessage.messageType === 'TEXT' 
                            ? truncateMessage(conversation.latestMessage.content)
                            : `📎 ${conversation.latestMessage.messageType.toLowerCase()}`
                          }
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">
                        Matched {formatTime(conversation.matchedAt)} • Start the conversation!
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center pt-4">
        <Button
          onClick={fetchConversations}
          variant="outline"
          className="w-full sm:w-auto"
        >
          🔄 Refresh Conversations
        </Button>
      </div>
    </div>
  );
} 