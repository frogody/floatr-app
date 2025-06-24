'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BoatCardProps {
  boat: any; // We'll properly type this later
}

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

const getVibeEmoji = (vibe: string) => {
  const emojiMap: { [key: string]: string } = {
    PARTY: '🎉',
    CHILL: '😌',
    PRIVATE: '🔒',
    FAMILY: '👨‍👩‍👧‍👦',
    ADVENTURE: '🗺️',
  };
  return emojiMap[vibe] || '⚓';
};

const getVibeColor = (vibe: string) => {
  const colorMap: { [key: string]: string } = {
    PARTY: 'bg-pink-100 text-pink-800',
    CHILL: 'bg-blue-100 text-blue-800',
    PRIVATE: 'bg-gray-100 text-gray-800',
    FAMILY: 'bg-green-100 text-green-800',
    ADVENTURE: 'bg-orange-100 text-orange-800',
  };
  return colorMap[vibe] || 'bg-gray-100 text-gray-800';
};

export function BoatCard({ boat }: BoatCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const formatBoatType = (type: string) => {
    return type.toLowerCase().replace('_', ' ').replace(/^\w/, c => c.toUpperCase());
  };

  const formatVibe = (vibe: string) => {
    return vibe.toLowerCase().replace(/^\w/, c => c.toUpperCase());
  };

  const truncateDescription = (text: string, maxLength: number = 120) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">{getBoatTypeEmoji(boat.type)}</span>
              {boat.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatBoatType(boat.type)} 
              {boat.length && ` • ${boat.length}m`}
              {' • '}Capacity: {boat.capacity}
            </CardDescription>
          </div>
          <Badge 
            variant="secondary" 
            className={getVibeColor(boat.currentVibe)}
          >
            {getVibeEmoji(boat.currentVibe)} {formatVibe(boat.currentVibe)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Boat Image */}
        {boat.images && boat.images.length > 0 && (
          <div className="aspect-video relative overflow-hidden rounded-lg bg-gray-100">
            <img
              src={boat.images[0]}
              alt={boat.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Description */}
        {boat.description && (
          <div>
            <p className="text-sm text-muted-foreground">
              {showFullDescription 
                ? boat.description 
                : truncateDescription(boat.description)
              }
              {boat.description.length > 120 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="ml-1 text-primary hover:underline text-sm"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Amenities */}
        {boat.amenities && boat.amenities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Amenities</h4>
            <div className="flex flex-wrap gap-1">
              {boat.amenities.slice(0, 4).map((amenity: string) => (
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

        {/* Crew Information */}
        {boat.crew && boat.crew.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Current Crew ({boat.crew.length})
            </h4>
            <div className="flex -space-x-2">
              {boat.crew.slice(0, 3).map((member: any) => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={member.user.profile?.profileImage} />
                  <AvatarFallback className="text-xs">
                    {member.user.profile?.firstName?.[0]}
                    {member.user.profile?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {boat.crew.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">
                    +{boat.crew.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        {boat.locations && boat.locations.length > 0 && (
          <div className="text-xs text-muted-foreground">
            📍 Last seen: {new Date(boat.locations[0].recordedAt).toLocaleDateString()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <a href={`/dashboard/boat/${boat.id}`}>
              Edit Details
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <a href={`/dashboard/boat/${boat.id}/crew`}>
              Manage Crew
            </a>
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Status: {boat.isActive ? 'Active' : 'Inactive'}
          </span>
          <span>
            Created: {new Date(boat.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
} 