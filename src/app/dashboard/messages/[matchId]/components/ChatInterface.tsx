'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SocketProvider } from '@/lib/socket';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';

interface ChatData {
  match: {
    id: string;
    status: string;
    matchedAt: string;
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
  };
  chatRoom: {
    id: string;
    isActive: boolean;
    lastMessageAt: string | null;
    participants: string[];
  };
  messages: Array<{
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
  }>;
  totalMessages: number;
  unreadCount: number;
}

interface ChatInterfaceProps {
  matchId: string;
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

export function ChatInterface({ matchId }: ChatInterfaceProps) {
  const { user } = useUser();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat data and messages
  const fetchChatData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/matches/${matchId}/messages`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Chat not found or you don\'t have access to this conversation');
        }
        throw new Error('Failed to load chat');
      }

      const data = await response.json();
      setChatData(data.data);

    } catch (error) {
      console.error('Error fetching chat data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatData();
  }, [matchId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !chatData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-4">😕</div>
              <h3 className="font-semibold mb-2">Unable to load chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error || 'This conversation could not be found'}
              </p>
              <div className="space-y-2">
                <Button onClick={fetchChatData} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Link href="/dashboard/messages">
                  <Button variant="ghost" className="w-full">
                    Back to Messages
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SocketProvider>
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b shadow-sm flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {/* Back Button */}
                <Link href="/dashboard/messages">
                  <Button variant="ghost" size="sm" className="px-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                </Link>

                {/* Other Boat Info */}
                <div className="flex items-center space-x-3">
                  {/* Boat Image */}
                  <div className="relative">
                    {chatData.match.otherBoat.images.length > 0 ? (
                      <img
                        src={chatData.match.otherBoat.images[0]}
                        alt={chatData.match.otherBoat.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                        {getBoatTypeEmoji(chatData.match.otherBoat.type)}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 text-sm">
                      {getVibeEmoji(chatData.match.otherBoat.currentVibe)}
                    </div>
                  </div>

                  {/* Boat & Captain Details */}
                  <div>
                    <h1 className="font-semibold text-gray-900 flex items-center gap-1">
                      {getBoatTypeEmoji(chatData.match.otherBoat.type)} {chatData.match.otherBoat.name}
                    </h1>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={chatData.match.otherBoat.captain.profileImage} />
                        <AvatarFallback className="text-xs">
                          {chatData.match.otherBoat.captain.firstName?.[0]}
                          {chatData.match.otherBoat.captain.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">
                        Captain {chatData.match.otherBoat.captain.firstName} {chatData.match.otherBoat.captain.lastName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Info */}
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ✨ Matched
                </Badge>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {new Date(chatData.match.matchedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages - Fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages 
            matchId={matchId}
            messages={chatData.messages}
            currentUserId={user?.id || ''}
            otherBoat={chatData.match.otherBoat}
          />
        </div>

        {/* Message Input - Fixed at bottom */}
        <div className="flex-shrink-0 bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <MessageInput 
              matchId={matchId}
              currentUserId={user?.id || ''}
              disabled={!chatData.chatRoom.isActive}
            />
          </div>
        </div>
      </div>
    </SocketProvider>
  );
} 