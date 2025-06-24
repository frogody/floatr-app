'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BoatProfile {
  id: string;
  name: string;
  type: string;
  currentVibe: string;
  capacity: number;
  description?: string;
  amenities: string[];
  images: string[];
  captain: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  crewCount: number;
  distance: number;
}

interface BoatCardProps {
  boat: BoatProfile;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  isSwipping?: boolean;
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

const formatBoatType = (type: string) => {
  return type.toLowerCase().replace('_', ' ').replace(/^\w/, c => c.toUpperCase());
};

const formatVibe = (vibe: string) => {
  return vibe.toLowerCase().replace(/^\w/, c => c.toUpperCase());
};

export function BoatCard({ boat, onSwipeLeft, onSwipeRight, isSwipping }: BoatCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const nextImage = () => {
    if (boat.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % boat.images.length);
    }
  };

  const prevImage = () => {
    if (boat.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + boat.images.length) % boat.images.length);
    }
  };

  // Handle touch/mouse events for swipe gestures
  const handleStart = (clientX: number, clientY: number) => {
    if (isSwipping) return;
    setIsDragging(true);
    setDragOffset({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, _clientY: number) => {
    if (!isDragging || isSwipping) return;
    
    const deltaX = clientX - dragOffset.x;
    const _deltaY = _clientY - dragOffset.y;
    
    // Update visual feedback based on drag
    const element = document.getElementById(`boat-card-${boat.id}`);
    if (element) {
      const rotation = deltaX * 0.1;
      element.style.transform = `translateX(${deltaX}px) translateY(${_deltaY}px) rotate(${rotation}deg)`;
      
      // Visual feedback for like/pass
      if (Math.abs(deltaX) > 50) {
        element.style.opacity = '0.8';
        if (deltaX > 0) {
          element.style.borderColor = '#10b981'; // green
        } else {
          element.style.borderColor = '#ef4444'; // red
        }
      } else {
        element.style.opacity = '1';
        element.style.borderColor = '';
      }
    }
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!isDragging || isSwipping) return;
    
    const deltaX = clientX - dragOffset.x;
    const threshold = 100;
    
    const element = document.getElementById(`boat-card-${boat.id}`);
    if (element) {
      element.style.transform = '';
      element.style.opacity = '';
      element.style.borderColor = '';
    }
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <Card 
      id={`boat-card-${boat.id}`}
      className={`h-full w-full shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isSwipping ? 'opacity-50' : ''
      }`}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={(e) => handleEnd(e.clientX, e.clientY)}
      onMouseLeave={(e) => handleEnd(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e) => {
        const touch = e.changedTouches[0];
        handleEnd(touch.clientX, touch.clientY);
      }}
    >
      <CardContent className="p-0 h-full flex flex-col">
        {/* Image carousel */}
        <div className="relative h-80 bg-gray-100 rounded-t-lg overflow-hidden">
          {boat.images && boat.images.length > 0 ? (
            <>
              <img
                src={boat.images[currentImageIndex]}
                alt={boat.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              
              {/* Image navigation */}
              {boat.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    &#8249;
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    &#8250;
                  </button>
                  
                  {/* Image indicators */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    {boat.images.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">{getBoatTypeEmoji(boat.type)}</div>
                <div className="text-sm">No photo</div>
              </div>
            </div>
          )}

          {/* Distance badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/70 text-white border-none">
              {boat.distance}km away
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{getBoatTypeEmoji(boat.type)}</span>
                {boat.name}
              </h2>
              <p className="text-sm text-gray-600">
                {formatBoatType(boat.type)}
              </p>
            </div>
            <Badge 
              variant="secondary" 
              className={getVibeColor(boat.currentVibe)}
            >
              {getVibeEmoji(boat.currentVibe)} {formatVibe(boat.currentVibe)}
            </Badge>
          </div>

          {/* Description */}
          {boat.description && (
            <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
              {boat.description}
            </p>
          )}

          {/* Capacity */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Capacity:</span> {boat.crewCount}/{boat.capacity}
            </div>
            {boat.capacity - boat.crewCount > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                {boat.capacity - boat.crewCount} spots available
              </Badge>
            )}
          </div>

          {/* Captain info */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={boat.captain.profileImage} />
              <AvatarFallback className="text-sm">
                {boat.captain.firstName?.[0]}{boat.captain.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">
                Captain {boat.captain.firstName} {boat.captain.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Verified maritime professional
              </p>
            </div>
          </div>

          {/* Amenities */}
          {boat.amenities.length > 0 && (
            <div className="mt-auto">
              <p className="text-sm text-gray-500 mb-2">Amenities</p>
              <div className="flex flex-wrap gap-1">
                {boat.amenities.slice(0, 4).map((amenity) => (
                  <Badge key={amenity} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {boat.amenities.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{boat.amenities.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 