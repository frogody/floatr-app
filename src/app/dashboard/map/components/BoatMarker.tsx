'use client';

import { useState } from 'react';

interface BoatMarkerProps {
  boat: {
    id: string;
    name: string;
    type: string;
    currentVibe: string;
    capacity: number;
    crewCount: number;
    distance: number;
  };
  onClick?: () => void;
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
    PARTY: 'bg-pink-500 border-pink-600',
    CHILL: 'bg-blue-500 border-blue-600',
    PRIVATE: 'bg-gray-500 border-gray-600',
    FAMILY: 'bg-green-500 border-green-600',
    ADVENTURE: 'bg-orange-500 border-orange-600',
  };
  return colorMap[vibe] || 'bg-blue-500 border-blue-600';
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

export function BoatMarker({ boat, onClick }: BoatMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const vibeEmoji = getVibeEmoji(boat.currentVibe);
  const vibeColor = getVibeColor(boat.currentVibe);
  const boatTypeEmoji = getBoatTypeEmoji(boat.type);

  return (
    <div
      className="relative cursor-pointer transform transition-all duration-200 hover:scale-110"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main marker */}
      <div
        className={`
          relative flex items-center justify-center
          w-12 h-12 rounded-full border-3 shadow-lg
          ${vibeColor}
          ${isHovered ? 'scale-110 shadow-xl' : ''}
          transition-all duration-200
        `}
      >
        {/* Primary vibe emoji */}
        <span className="text-lg text-white filter drop-shadow-sm">
          {vibeEmoji}
        </span>

        {/* Boat type indicator (small) */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs border-2 border-gray-200 shadow-sm">
          {boatTypeEmoji}
        </div>

        {/* Crew count indicator */}
        {boat.crewCount > 0 && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 border-2 border-gray-200 shadow-sm">
            {boat.crewCount}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50">
          <div className="font-medium">{boat.name}</div>
          <div className="text-gray-300">
            {boat.distance}km • {boat.crewCount}/{boat.capacity} crew
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent border-t-black/80"></div>
        </div>
      )}

      {/* Pulse animation for active boats */}
      <div
        className={`
          absolute inset-0 rounded-full animate-ping opacity-20
          ${vibeColor.split(' ')[0]}
        `}
        style={{
          animationDuration: '2s',
          animationIterationCount: 'infinite',
        }}
      />
    </div>
  );
} 