'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BoatCard } from './BoatCard';
import { MatchModal } from './MatchModal';

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

interface Match {
  id: string;
  status: string;
  matchedAt: string;
  targetBoat: BoatProfile;
}

export function SwipeInterface() {
  const [boats, setBoats] = useState<BoatProfile[]>([]);
  const [currentBoatId, setCurrentBoatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipping, setIsSwipping] = useState(false);
  const [matchResult, setMatchResult] = useState<Match | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Get user's current location for nearby boats
  const getCurrentLocation = useCallback(() => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  // Fetch user's active boat
  const fetchUserBoat = useCallback(async () => {
    try {
      const response = await fetch('/api/location');
      if (response.ok) {
        const data = await response.json();
        if (data.data.boats && data.data.boats.length > 0) {
          return data.data.boats[0]; // Get first active boat
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching user boat:', error);
      return null;
    }
  }, []);

  // Fetch nearby boats excluding already swiped ones
  const fetchNearbyBoats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const location = await getCurrentLocation();
      const userBoat = await fetchUserBoat();

      if (!userBoat) {
        setError('You need to create a boat profile first to start discovering other boats.');
        setIsLoading(false);
        return;
      }

      setCurrentBoatId(userBoat.id);

      // Get already swiped boats to exclude them
      const swipedResponse = await fetch(`/api/match?boatId=${userBoat.id}`);
      const swipedData = swipedResponse.ok ? await swipedResponse.json() : { data: { matches: [] } };
             const swipedBoatIds = swipedData.data.matches?.map((match: { boat: { id: string } }) => match.boat.id) || [];

      // Get swipe actions to exclude passed boats
      // Note: We'll implement this API endpoint later, for now just use matches
      
      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
        radius: '50',
      });

      const response = await fetch(`/api/boats/nearby?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch nearby boats');
      }

      const data = await response.json();
      
      // Filter out user's own boat and already swiped boats
      const filteredBoats = (data.data.boats || []).filter((boat: BoatProfile) => 
        boat.id !== userBoat.id && !swipedBoatIds.includes(boat.id)
      );

      setBoats(filteredBoats);
      setCurrentIndex(0);
      
      if (filteredBoats.length === 0) {
        setError('No new boats to discover in your area. Try expanding your search radius or check back later!');
      }

    } catch (error) {
      console.error('Error fetching boats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load boats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentLocation, fetchUserBoat]);

  // Handle swipe action
  const handleSwipe = useCallback(async (action: 'LIKE' | 'PASS') => {
    if (!currentBoatId || currentIndex >= boats.length || isSwipping) return;

    const currentBoat = boats[currentIndex];
    if (!currentBoat) return;

    setIsSwipping(true);

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boatId: currentBoatId,
          targetBoatId: currentBoat.id,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record swipe');
      }

      const data = await response.json();
      
      // Check if it's a match
      if (data.data.isMatch && data.data.match) {
        setMatchResult(data.data.match);
        setShowMatchModal(true);
      }

      // Move to next boat
      setCurrentIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error recording swipe:', error);
      // Still move to next boat to avoid getting stuck
      setCurrentIndex(prev => prev + 1);
    } finally {
      setIsSwipping(false);
    }
  }, [currentBoatId, boats, currentIndex, isSwipping]);

  // Load boats on component mount
  useEffect(() => {
    fetchNearbyBoats();
  }, [fetchNearbyBoats]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Finding boats near you...</p>
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
              <div className="text-4xl mb-4">🤷‍♂️</div>
              <h3 className="font-semibold mb-2">Oops!</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchNearbyBoats} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No more boats state
  if (currentIndex >= boats.length) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="font-semibold mb-2">You&apos;ve seen all nearby boats!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Check back later for new boats in your area, or try expanding your search radius.
              </p>
              <Button onClick={fetchNearbyBoats} className="w-full">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBoat = boats[currentIndex];
  const nextBoat = boats[currentIndex + 1];
  const remainingCount = boats.length - currentIndex;

  return (
    <div className="max-w-md mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Discovering boats</span>
          <span>{remainingCount} remaining</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / boats.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative h-[600px] mb-6">
        {/* Next card (background) */}
        {nextBoat && (
          <div className="absolute inset-0 transform scale-95 opacity-50">
            <BoatCard boat={nextBoat} />
          </div>
        )}
        
        {/* Current card (foreground) */}
        <div className="absolute inset-0 transform transition-transform duration-300">
          <BoatCard 
            boat={currentBoat} 
            onSwipeLeft={() => handleSwipe('PASS')}
            onSwipeRight={() => handleSwipe('LIKE')}
            isSwipping={isSwipping}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={() => handleSwipe('PASS')}
          disabled={isSwipping}
          variant="outline"
          size="lg"
          className="flex-1 h-14 text-lg border-red-200 text-red-600 hover:bg-red-50"
        >
          👎 Pass
        </Button>
        <Button
          onClick={() => handleSwipe('LIKE')}
          disabled={isSwipping}
          size="lg"
          className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
        >
          👍 Like
        </Button>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Swipe right to like • Swipe left to pass
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Only verified captains can initiate matches
        </p>
      </div>

      {/* Match Modal */}
      {matchResult && (
        <MatchModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          match={matchResult}
        />
      )}
    </div>
  );
} 