'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BoatPopupProps {
  boat: {
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
    crew: Array<{
      firstName?: string;
      lastName?: string;
      profileImage?: string;
    }>;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      lastUpdated: string;
    };
    distance: number;
  };
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

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export function BoatPopup({ boat }: BoatPopupProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border p-4 min-w-80 max-w-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-xl">{getBoatTypeEmoji(boat.type)}</span>
            {boat.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatBoatType(boat.type)} • {boat.distance}km away
          </p>
        </div>
        <Badge 
          variant="secondary" 
          className={getVibeColor(boat.currentVibe)}
        >
          {getVibeEmoji(boat.currentVibe)} {formatVibe(boat.currentVibe)}
        </Badge>
      </div>

      {/* Boat Image */}
      {boat.images && boat.images.length > 0 && (
        <div className="mb-3">
          <img
            src={boat.images[0]}
            alt={boat.name}
            className="w-full h-32 object-cover rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Description */}
      {boat.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {boat.description}
        </p>
      )}

      {/* Capacity and Crew */}
      <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <span className="font-medium">Capacity:</span> {boat.crewCount}/{boat.capacity}
        </div>
        {boat.capacity - boat.crewCount > 0 && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            {boat.capacity - boat.crewCount} spots available
          </Badge>
        )}
      </div>

      {/* Captain */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={boat.captain.profileImage} />
          <AvatarFallback className="text-xs">
            {boat.captain.firstName?.[0]}{boat.captain.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            Captain {boat.captain.firstName} {boat.captain.lastName}
          </p>
        </div>
      </div>

      {/* Crew Members */}
      {boat.crew.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">
            Current Crew ({boat.crew.length})
          </p>
          <div className="flex -space-x-1">
            {boat.crew.slice(0, 5).map((member, index) => (
              <Avatar key={index} className="h-6 w-6 border-2 border-white">
                <AvatarImage src={member.profileImage} />
                <AvatarFallback className="text-xs">
                  {member.firstName?.[0]}{member.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {boat.crew.length > 5 && (
              <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs text-gray-600">
                  +{boat.crew.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amenities */}
      {boat.amenities.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Amenities</p>
          <div className="flex flex-wrap gap-1">
            {boat.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {boat.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{boat.amenities.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Location Info */}
      <div className="text-xs text-muted-foreground mb-3 space-y-1">
        <div>📍 {boat.location.latitude.toFixed(4)}, {boat.location.longitude.toFixed(4)}</div>
        <div>🕒 Last seen: {formatTimeAgo(boat.location.lastUpdated)}</div>
        {boat.location.speed && boat.location.speed > 0 && (
          <div>💨 Speed: {boat.location.speed.toFixed(1)} knots</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1">
          👋 Say Hello
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          📍 Get Directions
        </Button>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Connect to start chatting and planning meetups!
      </p>
    </div>
  );
} 