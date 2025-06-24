import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateDistanceNauticalMiles,
  calculateBearing,
  isWithinRadius,
  degreesToRadians,
  radiansToDegrees,
  formatDistance,
  getCompassDirection,
} from '@/lib/utils/distance';

describe('Distance Utility Functions', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two points correctly', () => {
      // Distance between Amsterdam and Paris (approximately 430 km)
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      
      const distance = calculateDistance(amsterdam.lat, amsterdam.lng, paris.lat, paris.lng);
      
      // Should be approximately 430 km (allowing for some variance due to Earth's curvature calculations)
      expect(distance).toBeCloseTo(430, 0);
    });

    it('returns 0 for same point', () => {
      const distance = calculateDistance(52.3676, 4.9041, 52.3676, 4.9041);
      expect(distance).toBe(0);
    });

    it('calculates small distances accurately', () => {
      // 1 km north from Amsterdam
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const oneKmNorth = { lat: 52.3676 + (1 / 111.32), lng: 4.9041 }; // Approximately 1 km north
      
      const distance = calculateDistance(amsterdam.lat, amsterdam.lng, oneKmNorth.lat, oneKmNorth.lng);
      
      expect(distance).toBeCloseTo(1, 1);
    });

    it('handles antipodal points', () => {
      // Antipodal points are approximately 20,000 km apart (half of Earth's circumference)
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 0, lng: 180 };
      
      const distance = calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
      
      expect(distance).toBeCloseTo(20003.93, 0); // Half of Earth's circumference
    });

    it('handles negative coordinates', () => {
      // Test with negative coordinates (Southern/Western hemispheres)
      const sydney = { lat: -33.8688, lng: 151.2093 };
      const santiago = { lat: -33.4489, lng: -70.6693 };
      
      const distance = calculateDistance(sydney.lat, sydney.lng, santiago.lat, santiago.lng);
      
      expect(distance).toBeGreaterThan(11000); // Should be over 11,000 km
      expect(distance).toBeLessThan(12000);
    });
  });

  describe('calculateDistanceNauticalMiles', () => {
    it('converts kilometers to nautical miles correctly', () => {
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      
      const kmDistance = calculateDistance(amsterdam.lat, amsterdam.lng, paris.lat, paris.lng);
      const nmDistance = calculateDistanceNauticalMiles(amsterdam.lat, amsterdam.lng, paris.lat, paris.lng);
      
      // 1 km = 0.539957 nautical miles
      expect(nmDistance).toBeCloseTo(kmDistance * 0.539957, 2);
    });

    it('returns 0 for same point', () => {
      const distance = calculateDistanceNauticalMiles(52.3676, 4.9041, 52.3676, 4.9041);
      expect(distance).toBe(0);
    });
  });

  describe('calculateBearing', () => {
    it('calculates bearing from Amsterdam to Paris', () => {
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const paris = { lat: 48.8566, lng: 2.3522 };
      
      const bearing = calculateBearing(amsterdam.lat, amsterdam.lng, paris.lat, paris.lng);
      
      // Paris is roughly southwest of Amsterdam
      expect(bearing).toBeGreaterThan(200);
      expect(bearing).toBeLessThan(240);
    });

    it('calculates exact cardinal directions', () => {
      const center = { lat: 0, lng: 0 };
      
      // North
      const north = calculateBearing(center.lat, center.lng, 1, 0);
      expect(north).toBeCloseTo(0, 1);
      
      // East
      const east = calculateBearing(center.lat, center.lng, 0, 1);
      expect(east).toBeCloseTo(90, 1);
      
      // South
      const south = calculateBearing(center.lat, center.lng, -1, 0);
      expect(south).toBeCloseTo(180, 1);
      
      // West
      const west = calculateBearing(center.lat, center.lng, 0, -1);
      expect(west).toBeCloseTo(270, 1);
    });

    it('returns value between 0 and 360', () => {
      const bearing = calculateBearing(52.3676, 4.9041, 48.8566, 2.3522);
      
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('handles same point', () => {
      const bearing = calculateBearing(52.3676, 4.9041, 52.3676, 4.9041);
      
      // Bearing from point to itself should be 0 or handle gracefully
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('isWithinRadius', () => {
    it('returns true for points within radius', () => {
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const utrecht = { lat: 52.0907, lng: 5.1214 }; // About 40 km from Amsterdam
      
      const isWithin50km = isWithinRadius(amsterdam.lat, amsterdam.lng, utrecht.lat, utrecht.lng, 50);
      const isWithin30km = isWithinRadius(amsterdam.lat, amsterdam.lng, utrecht.lat, utrecht.lng, 30);
      
      expect(isWithin50km).toBe(true);
      expect(isWithin30km).toBe(false);
    });

    it('returns true for same point', () => {
      const isWithin = isWithinRadius(52.3676, 4.9041, 52.3676, 4.9041, 1);
      expect(isWithin).toBe(true);
    });

    it('returns false for points outside radius', () => {
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const paris = { lat: 48.8566, lng: 2.3522 }; // About 430 km from Amsterdam
      
      const isWithin100km = isWithinRadius(amsterdam.lat, amsterdam.lng, paris.lat, paris.lng, 100);
      
      expect(isWithin100km).toBe(false);
    });

    it('handles edge cases correctly', () => {
      const center = { lat: 0, lng: 0 };
      const point = { lat: 0, lng: 1 }; // About 111 km east
      
      // Test exact boundary
      const distance = calculateDistance(center.lat, center.lng, point.lat, point.lng);
      const isWithinExact = isWithinRadius(center.lat, center.lng, point.lat, point.lng, distance);
      const isWithinSlightlyLess = isWithinRadius(center.lat, center.lng, point.lat, point.lng, distance - 0.01);
      
      expect(isWithinExact).toBe(true);
      expect(isWithinSlightlyLess).toBe(false);
    });
  });

  describe('degreesToRadians', () => {
    it('converts degrees to radians correctly', () => {
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
      expect(degreesToRadians(270)).toBeCloseTo(3 * Math.PI / 2, 10);
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
    });

    it('handles negative degrees', () => {
      expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
      expect(degreesToRadians(-180)).toBeCloseTo(-Math.PI, 10);
    });
  });

  describe('radiansToDegrees', () => {
    it('converts radians to degrees correctly', () => {
      expect(radiansToDegrees(0)).toBe(0);
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10);
      expect(radiansToDegrees(3 * Math.PI / 2)).toBeCloseTo(270, 10);
      expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 10);
    });

    it('handles negative radians', () => {
      expect(radiansToDegrees(-Math.PI / 2)).toBeCloseTo(-90, 10);
      expect(radiansToDegrees(-Math.PI)).toBeCloseTo(-180, 10);
    });

    it('is inverse of degreesToRadians', () => {
      const degrees = 45;
      const converted = radiansToDegrees(degreesToRadians(degrees));
      expect(converted).toBeCloseTo(degrees, 10);
    });
  });

  describe('formatDistance', () => {
    it('formats distances in meters for small values', () => {
      expect(formatDistance(0.1)).toBe('100m');
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.999)).toBe('999m');
    });

    it('formats distances in kilometers for large values', () => {
      expect(formatDistance(1)).toBe('1.0km');
      expect(formatDistance(1.5)).toBe('1.5km');
      expect(formatDistance(10.25)).toBe('10.3km');
      expect(formatDistance(100)).toBe('100.0km');
    });

    it('respects precision parameter', () => {
      expect(formatDistance(1.2345, 0)).toBe('1km');
      expect(formatDistance(1.2345, 1)).toBe('1.2km');
      expect(formatDistance(1.2345, 2)).toBe('1.23km');
      expect(formatDistance(1.2345, 3)).toBe('1.235km');
    });

    it('handles edge cases', () => {
      expect(formatDistance(0)).toBe('0m');
      expect(formatDistance(1.0, 0)).toBe('1km');
    });
  });

  describe('getCompassDirection', () => {
    it('returns correct cardinal directions', () => {
      expect(getCompassDirection(0)).toBe('N');
      expect(getCompassDirection(90)).toBe('E');
      expect(getCompassDirection(180)).toBe('S');
      expect(getCompassDirection(270)).toBe('W');
    });

    it('returns correct intermediate directions', () => {
      expect(getCompassDirection(45)).toBe('NE');
      expect(getCompassDirection(135)).toBe('SE');
      expect(getCompassDirection(225)).toBe('SW');
      expect(getCompassDirection(315)).toBe('NW');
    });

    it('handles edge cases and wrapping', () => {
      expect(getCompassDirection(360)).toBe('N');
      expect(getCompassDirection(22.5)).toBe('NE'); // 22.5° rounds to 45° sector
      expect(getCompassDirection(337.5)).toBe('N'); // 337.5° rounds to 0° sector
    });

    it('handles out-of-range values gracefully', () => {
      // Values outside 0-360 should still work due to modulo operation
      expect(getCompassDirection(-90)).toBe('W'); // -90 + 360 = 270
      expect(getCompassDirection(450)).toBe('E'); // 450 - 360 = 90
    });

    it('returns consistent results for boundary values', () => {
      // Test values at sector boundaries
      expect(getCompassDirection(22)).toBe('N');
      expect(getCompassDirection(23)).toBe('NE');
      expect(getCompassDirection(67)).toBe('NE');
      expect(getCompassDirection(68)).toBe('E');
    });
  });

  describe('Integration Tests', () => {
    it('combines distance and bearing calculations correctly', () => {
      const amsterdam = { lat: 52.3676, lng: 4.9041 };
      const utrecht = { lat: 52.0907, lng: 5.1214 };
      
      const distance = calculateDistance(amsterdam.lat, amsterdam.lng, utrecht.lat, utrecht.lng);
      const bearing = calculateBearing(amsterdam.lat, amsterdam.lng, utrecht.lat, utrecht.lng);
      const direction = getCompassDirection(bearing);
      const formattedDistance = formatDistance(distance);
      
      expect(distance).toBeGreaterThan(0);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
      expect(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']).toContain(direction);
      expect(formattedDistance).toMatch(/^\d+\.\d+km$/);
    });

    it('validates maritime coordinates accurately', () => {
      // Test typical maritime scenarios
      const portOfAmsterdam = { lat: 52.3963, lng: 4.8508 };
      const portOfRotterdam = { lat: 51.9225, lng: 4.4792 };
      
      const distance = calculateDistance(
        portOfAmsterdam.lat, 
        portOfAmsterdam.lng, 
        portOfRotterdam.lat, 
        portOfRotterdam.lng
      );
      
      const nauticalDistance = calculateDistanceNauticalMiles(
        portOfAmsterdam.lat, 
        portOfAmsterdam.lng, 
        portOfRotterdam.lat, 
        portOfRotterdam.lng
      );
      
      // Distance between Dutch ports should be reasonable
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(100);
      expect(nauticalDistance).toBeLessThan(distance); // Nautical miles are longer than km
    });
  });
}); 