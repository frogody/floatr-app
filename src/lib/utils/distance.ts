/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 - Latitude of first point in decimal degrees
 * @param lon1 - Longitude of first point in decimal degrees  
 * @param lat2 - Latitude of second point in decimal degrees
 * @param lon2 - Longitude of second point in decimal degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Earth's radius in kilometers
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  // Haversine formula
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Calculate distance in nautical miles
 * @param lat1 - Latitude of first point in decimal degrees
 * @param lon1 - Longitude of first point in decimal degrees  
 * @param lat2 - Latitude of second point in decimal degrees
 * @param lon2 - Longitude of second point in decimal degrees
 * @returns Distance in nautical miles
 */
export function calculateDistanceNauticalMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const kmDistance = calculateDistance(lat1, lon1, lat2, lon2);
  return kmDistance * 0.539957; // Convert km to nautical miles
}

/**
 * Calculate the bearing (compass direction) from one point to another
 * @param lat1 - Latitude of starting point in decimal degrees
 * @param lon1 - Longitude of starting point in decimal degrees
 * @param lat2 - Latitude of destination point in decimal degrees
 * @param lon2 - Longitude of destination point in decimal degrees
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360 degrees
}

/**
 * Check if a point is within a given radius of another point
 * @param centerLat - Latitude of center point
 * @param centerLon - Longitude of center point
 * @param pointLat - Latitude of point to check
 * @param pointLon - Longitude of point to check
 * @param radiusKm - Radius in kilometers
 * @returns True if point is within radius
 */
export function isWithinRadius(
  centerLat: number, 
  centerLon: number, 
  pointLat: number, 
  pointLon: number, 
  radiusKm: number
): boolean {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusKm;
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number, precision: number = 1): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(precision)}km`;
}

/**
 * Get compass direction from bearing
 * @param bearing - Bearing in degrees (0-360)
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
} 