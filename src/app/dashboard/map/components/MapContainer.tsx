'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, GeolocateControl, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Map-specific imports only
import { BoatMarker } from './BoatMarker';
import { BoatPopup } from './BoatPopup';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

interface BoatLocation {
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
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Default location (Amsterdam harbor as fallback)
const DEFAULT_LOCATION = {
  latitude: 52.3676,
  longitude: 4.9041,
};

export function MapContainer() {
  // State must be initialized before any early returns
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyBoats, setNearbyBoats] = useState<BoatLocation[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<BoatLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    zoom: 12,
  });

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const locationUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const nearbyBoatsInterval = useRef<NodeJS.Timeout | null>(null);

  // Check if Mapbox token is configured
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your-mapbox')) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Map Configuration Required</CardTitle>
            <CardDescription>
              Mapbox access token not configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Please add your Mapbox access token to the environment variables to use the map feature.
            </p>
            <Button asChild variant="outline">
              <a href="/dashboard" className="w-full">
                Back to Dashboard
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        setUserLocation(newLocation);
        setViewport(prev => ({
          ...prev,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        }));
        setIsLoading(false);

        // Send location to server
        updateServerLocation(newLocation);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Unable to access your location');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );
  }, []);

  // Update location on server
  const updateServerLocation = useCallback(async (location: UserLocation) => {
    try {
      const response = await fetch('/api/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          isVisible: true,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update location on server');
      }
    } catch (error) {
      console.error('Error updating server location:', error);
    }
  }, []);

  // Fetch nearby boats
  const fetchNearbyBoats = useCallback(async () => {
    if (!userLocation) return;

    try {
      const params = new URLSearchParams({
        lat: userLocation.latitude.toString(),
        lng: userLocation.longitude.toString(),
        radius: '50', // 50km radius
      });

      const response = await fetch(`/api/boats/nearby?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setNearbyBoats(data.data.boats || []);
      } else {
        console.error('Failed to fetch nearby boats');
      }
    } catch (error) {
      console.error('Error fetching nearby boats:', error);
    }
  }, [userLocation]);

  // Initialize location and set up intervals
  useEffect(() => {
    getCurrentLocation();

    // Set up periodic location updates (every 30 seconds)
    locationUpdateInterval.current = setInterval(() => {
      getCurrentLocation();
    }, 30000);

    return () => {
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [getCurrentLocation]);

  // Set up nearby boats fetching
  useEffect(() => {
    if (userLocation) {
      fetchNearbyBoats();

      // Set up periodic nearby boats updates (every 15 seconds)
      nearbyBoatsInterval.current = setInterval(() => {
        fetchNearbyBoats();
      }, 15000);
    }

    return () => {
      if (nearbyBoatsInterval.current) {
        clearInterval(nearbyBoatsInterval.current);
      }
    };
  }, [userLocation, fetchNearbyBoats]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Location Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={getCurrentLocation} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Map */}
      <Map
        ref={mapRef}
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
        maxZoom={20}
        minZoom={3}
      >
        {/* Map Controls */}
        <GeolocateControl 
          position="top-right"
          trackUserLocation={true}
          showUserHeading={true}
        />
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="center"
          >
            <div className="bg-blue-600 rounded-full p-2 border-4 border-white shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </Marker>
        )}

        {/* Nearby Boat Markers */}
        {nearbyBoats.map((boat) => (
          <Marker
            key={boat.id}
            latitude={boat.location.latitude}
            longitude={boat.location.longitude}
            anchor="center"
          >
            <BoatMarker
              boat={boat}
              onClick={() => setSelectedBoat(boat)}
            />
          </Marker>
        ))}

        {/* Selected Boat Popup */}
        {selectedBoat && (
          <Popup
            latitude={selectedBoat.location.latitude}
            longitude={selectedBoat.location.longitude}
            onClose={() => setSelectedBoat(null)}
            anchor="bottom"
            offset={[0, -10]}
            className="boat-popup"
          >
            <BoatPopup boat={selectedBoat} />
          </Popup>
        )}
      </Map>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium">Your Location</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {nearbyBoats.length} boats nearby
              </div>
              {nearbyBoats.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Closest: {Math.min(...nearbyBoats.map(b => b.distance))}km away
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          onClick={() => {
            getCurrentLocation();
            fetchNearbyBoats();
          }}
          size="sm"
          className="bg-white/90 backdrop-blur-sm border text-gray-700 hover:bg-white"
        >
          🔄 Refresh
        </Button>
      </div>
    </div>
  );
} 