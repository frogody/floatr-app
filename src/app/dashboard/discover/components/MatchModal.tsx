'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BoatProfile {
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

interface Match {
  id: string;
  status: string;
  matchedAt: string;
  targetBoat: BoatProfile;
}

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
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

const getVibeColor = (vibe: string) => {
  const colorMap: { [key: string]: string } = {
    PARTY: 'bg-pink-100 text-pink-800 border-pink-200',
    CHILL: 'bg-blue-100 text-blue-800 border-blue-200',
    PRIVATE: 'bg-gray-100 text-gray-800 border-gray-200',
    FAMILY: 'bg-green-100 text-green-800 border-green-200',
    ADVENTURE: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return colorMap[vibe] || 'bg-blue-100 text-blue-800 border-blue-200';
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

const formatVibe = (vibe: string) => {
  return vibe.toLowerCase().replace(/^\w/, c => c.toUpperCase());
};

export function MatchModal({ isOpen, onClose, match }: MatchModalProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true);
      setCurrentStep(0);
      
      // Animation sequence
      const timeouts = [
        setTimeout(() => setCurrentStep(1), 500),
        setTimeout(() => setCurrentStep(2), 1500),
        setTimeout(() => setCurrentStep(3), 2500),
      ];

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [isOpen]);

  const handleStartChat = () => {
    // Navigate to the chat page for this match
    console.log('Starting chat with match:', match.id);
    onClose();
    // Navigate to chat page
    window.location.href = `/dashboard/messages/${match.id}`;
  };

  const handleKeepSwiping = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border-0 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="sr-only">It&apos;s a Match!</DialogTitle>
        </DialogHeader>

        <div className="relative p-6">
          {/* Background animation */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            {showAnimation && (
              <>
                {/* Floating hearts */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute animate-bounce text-2xl ${
                      currentStep >= 1 ? 'opacity-100' : 'opacity-0'
                    } transition-opacity duration-500`}
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      top: `${Math.random() * 80 + 10}%`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: `${1.5 + Math.random()}s`,
                    }}
                  >
                    💕
                  </div>
                ))}
                
                {/* Sparkles */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`sparkle-${i}`}
                    className={`absolute text-yellow-400 ${
                      currentStep >= 2 ? 'animate-ping' : 'opacity-0'
                    } transition-opacity duration-300`}
                    style={{
                      left: `${Math.random() * 90 + 5}%`,
                      top: `${Math.random() * 90 + 5}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    ✨
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Main content */}
          <div className="relative z-10">
            {/* Title with animation */}
            <div className={`text-center mb-6 transition-all duration-1000 ${
              currentStep >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                It&apos;s a Match! 🎉
              </h1>
              <p className="text-gray-600">
                You and Captain {match.targetBoat.captain.firstName} liked each other!
              </p>
            </div>

            {/* Boat preview */}
            <div className={`transition-all duration-1000 delay-500 ${
              currentStep >= 2 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
            }`}>
              <div className="bg-white rounded-lg p-4 shadow-lg border-2 border-gradient-to-r from-pink-200 to-purple-200">
                <div className="flex items-center space-x-4">
                  {/* Boat image */}
                  <div className="relative">
                    {match.targetBoat.images && match.targetBoat.images.length > 0 ? (
                      <img
                        src={match.targetBoat.images[0]}
                        alt={match.targetBoat.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                        {getBoatTypeEmoji(match.targetBoat.type)}
                      </div>
                    )}
                  </div>

                  {/* Boat info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg flex items-center gap-1">
                      {getBoatTypeEmoji(match.targetBoat.type)} {match.targetBoat.name}
                    </h3>
                    <Badge 
                      variant="secondary" 
                      className={`${getVibeColor(match.targetBoat.currentVibe)} mt-1`}
                    >
                      {getVibeEmoji(match.targetBoat.currentVibe)} {formatVibe(match.targetBoat.currentVibe)}
                    </Badge>
                  </div>
                </div>

                {/* Captain info */}
                <div className="flex items-center space-x-3 mt-4 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={match.targetBoat.captain.profileImage} />
                    <AvatarFallback className="text-xs">
                      {match.targetBoat.captain.firstName?.[0]}{match.targetBoat.captain.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      Captain {match.targetBoat.captain.firstName} {match.targetBoat.captain.lastName}
                    </p>
                    <p className="text-xs text-gray-500">Ready to connect!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={`mt-6 space-y-3 transition-all duration-1000 delay-1000 ${
              currentStep >= 3 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
            }`}>
              <Button 
                onClick={handleStartChat}
                className="w-full h-12 text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                💬 Start Chat
              </Button>
              
              <Button 
                onClick={handleKeepSwiping}
                variant="outline"
                className="w-full h-10 text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Keep Swiping
              </Button>
            </div>

            {/* Match info */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Matched on {new Date(match.matchedAt).toLocaleDateString()} at{' '}
                {new Date(match.matchedAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 