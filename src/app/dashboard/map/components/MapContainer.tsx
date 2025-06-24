'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, GeolocateControl, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/mapbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

interface NoGoZone {
  id: string;
  name: string;
  zoneType: 'ECOLOGICAL' | 'ALCOHOL_FREE' | 'QUIET_ZONE' | 'NO_ANCHOR' | 'HIGH_TRAFFIC' | 'SPEED_RESTRICTED' | 'PROTECTED_AREA';
  description: string;
  severity: 'info' | 'warning' | 'danger';
  regulations: string[];
  authority?: string;
  contactInfo?: string;
  coordinates: number[][][];
}

interface MapClickEvent {
  lngLat: {
    lng: number;
    lat: number;
  };
  features?: Array<{
    source?: string;
    properties?: any;
  }>;
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
  const [noGoZones, setNoGoZones] = useState<NoGoZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<NoGoZone | null>(null);
  const [zonePopupLocation, setZonePopupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinPlacementAlert, setPinPlacementAlert] = useState<{
    zones: NoGoZone[];
    location: { lat: number; lng: number };
  } | null>(null);
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

  // Fetch no-go zones
  const fetchNoGoZones = useCallback(async () => {
    try {
      // Get current viewport bounds for efficient loading
      const bounds = viewport ? {
        north: viewport.latitude + 0.1,
        south: viewport.latitude - 0.1,
        east: viewport.longitude + 0.1,
        west: viewport.longitude - 0.1,
      } : undefined;

      const params = new URLSearchParams();
      if (bounds) {
        params.set('north', bounds.north.toString());
        params.set('south', bounds.south.toString());
        params.set('east', bounds.east.toString());
        params.set('west', bounds.west.toString());
      }

      const response = await fetch(`/api/zones?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setNoGoZones(data.data.zones || []);
      } else {
        console.error('Failed to fetch no-go zones');
      }
    } catch (error) {
      console.error('Error fetching no-go zones:', error);
    }
  }, [viewport]);

  // Check if a point is within no-go zones
  const checkPointInZones = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Error checking point in zones:', error);
    }
    return null;
  }, []);

  // Handle map click for pin placement and zone info
  const handleMapClick = useCallback(async (event: MapClickEvent) => {
    const { lng, lat } = event.lngLat;
    
    // Check if clicking on a zone (Mapbox features)
    const features = event.features;
    if (features && features.length > 0) {
      const zoneFeature = features.find(f => f.source === 'no-go-zones-source');
      if (zoneFeature && zoneFeature.properties) {
        // Show zone information popup
        const zone = noGoZones.find(z => z.id === zoneFeature.properties.id);
        if (zone) {
          setSelectedZone(zone);
          setZonePopupLocation({ lat, lng });
          return; // Don't proceed with pin placement
        }
      }
    }
    
    // Check if the clicked location is within any no-go zones for pin placement
    const zoneCheck = await checkPointInZones(lat, lng);
    
    if (zoneCheck?.withinZones && zoneCheck.zones.length > 0) {
      // Show pin placement warning
      setPinPlacementAlert({
        zones: zoneCheck.zones,
        location: { lat, lng },
      });
    } else {
      // Proceed with normal pin placement logic
      console.log('Pin placed at:', { lat, lng });
      // TODO: Implement actual pin placement logic
    }
  }, [checkPointInZones, noGoZones]);

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

  // Load no-go zones when viewport changes
  useEffect(() => {
    fetchNoGoZones();
  }, [fetchNoGoZones]);

  // Zone color mapping
  const getZoneColor = useCallback((zoneType: string, severity: string): string => {
    const baseColors = {
      ECOLOGICAL: '#10b981', // green
      ALCOHOL_FREE: '#f59e0b', // amber
      QUIET_ZONE: '#3b82f6', // blue
      NO_ANCHOR: '#ef4444', // red
      HIGH_TRAFFIC: '#dc2626', // dark red
      SPEED_RESTRICTED: '#f97316', // orange
      PROTECTED_AREA: '#059669', // emerald
    };

    const opacity = {
      info: '0.3',
      warning: '0.5',
      danger: '0.7',
    };

    const color = baseColors[zoneType as keyof typeof baseColors] || '#6b7280';
    const alpha = opacity[severity as keyof typeof opacity] || '0.4';
    
    return color + Math.round(parseFloat(alpha) * 255).toString(16).padStart(2, '0');
  }, []);

  // Create GeoJSON for zones
  const zonesGeoJSON = {
    type: 'FeatureCollection' as const,
    features: noGoZones.map(zone => ({
      type: 'Feature' as const,
      id: zone.id,
      properties: {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        description: zone.description,
        severity: zone.severity,
        regulations: zone.regulations,
        authority: zone.authority,
        contactInfo: zone.contactInfo,
        color: getZoneColor(zone.zoneType, zone.severity),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: zone.coordinates,
      },
    })),
  };

  // Zone layer styles
  const zoneLayerStyle = {
    id: 'no-go-zones',
    type: 'fill' as const,
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.6,
    },
  };

  const zoneOutlineLayerStyle = {
    id: 'no-go-zones-outline',
    type: 'line' as const,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.8,
    },
  };

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
        onClick={handleMapClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
        maxZoom={20}
        minZoom={3}
        interactiveLayerIds={['no-go-zones']}
      >
        {/* No-Go Zones */}
        {noGoZones.length > 0 && (
          <Source id="no-go-zones-source" type="geojson" data={zonesGeoJSON}>
            <Layer {...zoneLayerStyle} />
            <Layer {...zoneOutlineLayerStyle} />
          </Source>
        )}

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

        {/* Zone Information Popup */}
        {selectedZone && zonePopupLocation && (
          <Popup
            latitude={zonePopupLocation.lat}
            longitude={zonePopupLocation.lng}
            onClose={() => {
              setSelectedZone(null);
              setZonePopupLocation(null);
            }}
            anchor="bottom"
            offset={[0, -10]}
            className="zone-popup"
          >
            <div className="p-4 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={selectedZone.severity === 'danger' ? 'destructive' : 
                          selectedZone.severity === 'warning' ? 'secondary' : 'default'}
                >
                  {selectedZone.zoneType.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedZone.severity}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-sm mb-2">{selectedZone.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{selectedZone.description}</p>
              
              {selectedZone.regulations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium mb-1">Regulations:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {selectedZone.regulations.slice(0, 3).map((reg, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{reg}</span>
                      </li>
                    ))}
                    {selectedZone.regulations.length > 3 && (
                      <li className="text-xs italic">...and {selectedZone.regulations.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              
              {selectedZone.authority && (
                <div className="text-xs">
                  <span className="font-medium">Authority:</span> {selectedZone.authority}
                </div>
              )}
              
              {selectedZone.contactInfo && (
                <div className="text-xs mt-1">
                  <span className="font-medium">Contact:</span> {selectedZone.contactInfo}
                </div>
              )}
            </div>
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
              {noGoZones.length > 0 && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {noGoZones.length} maritime zones visible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Legend */}
      {noGoZones.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium mb-2">Maritime Zones</h4>
              <div className="space-y-1">
                {Array.from(new Set(noGoZones.map(z => z.zoneType))).slice(0, 5).map(type => {
                  const zone = noGoZones.find(z => z.zoneType === type);
                  if (!zone) return null;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm border"
                        style={{ backgroundColor: getZoneColor(type, zone.severity) }}
                      ></div>
                      <span className="text-xs">{type.replace('_', ' ')}</span>
                    </div>
                  );
                })}
                {noGoZones.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{noGoZones.length - 5} more zones
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Click zones for details
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pin Placement Alert */}
      {pinPlacementAlert && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Alert className="max-w-md bg-white shadow-lg">
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong>⚠️ Restricted Area Warning</strong>
                  <p className="text-sm mt-1">
                    You're trying to place a pin in {pinPlacementAlert.zones.length > 1 ? 'multiple restricted zones' : 'a restricted zone'}:
                  </p>
                </div>
                
                <div className="space-y-2">
                  {pinPlacementAlert.zones.slice(0, 2).map(zone => (
                    <div key={zone.id} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={zone.severity === 'danger' ? 'destructive' : 'secondary'} className="text-xs">
                          {zone.zoneType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-xs text-muted-foreground">{zone.description}</div>
                    </div>
                  ))}
                  {pinPlacementAlert.zones.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      ...and {pinPlacementAlert.zones.length - 2} more zones
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setPinPlacementAlert(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      // Proceed with pin placement despite warnings
                      console.log('Pin placed in restricted zone at:', pinPlacementAlert.location);
                      setPinPlacementAlert(null);
                      // TODO: Implement actual pin placement
                    }}
                  >
                    Place Anyway
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Refresh Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          onClick={() => {
            getCurrentLocation();
            fetchNearbyBoats();
            fetchNoGoZones();
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