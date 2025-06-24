import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface NearbyBoatsQuery {
  latitude?: string;
  longitude?: string;
  radius?: string; // in kilometers
  vibe?: string;
  boatType?: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// GET - Find nearby boats within specified radius
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query: NearbyBoatsQuery = {
      latitude: searchParams.get('lat') || undefined,
      longitude: searchParams.get('lng') || undefined,
      radius: searchParams.get('radius') || '50', // default 50km
      vibe: searchParams.get('vibe') || undefined,
      boatType: searchParams.get('type') || undefined,
    };

    // Validation
    if (!query.latitude || !query.longitude) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lng' },
        { status: 400 }
      );
    }

    const userLat = parseFloat(query.latitude!);
    const userLng = parseFloat(query.longitude!);
    const searchRadius = parseFloat(query.radius!);

    if (isNaN(userLat) || isNaN(userLng) || isNaN(searchRadius)) {
      return NextResponse.json(
        { error: 'Invalid coordinates or radius' },
        { status: 400 }
      );
    }

    // Find current user to exclude their own boats
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: { select: { id: true } },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's discovery settings
    const discoverySettings = await prisma.discoverySettings.findUnique({
      where: { userId: currentUser.id },
    });

    // Build filters based on discovery settings and query params
    const whereClause: any = {
      isActive: true,
      // Exclude current user's boats
      captainId: {
        not: currentUser.id,
      },
      // Only show boats from verified captains
      captain: {
        isVerified: true,
        isActive: true,
      },
      // Include locations that are visible and recent (within last 2 hours)
      locations: {
        some: {
          isVisible: true,
          recordedAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
        },
      },
    };

    // Apply vibe filter
    if (query.vibe) {
      whereClause.currentVibe = query.vibe;
    } else if (discoverySettings?.preferredVibes && discoverySettings.preferredVibes.length > 0) {
      whereClause.currentVibe = {
        in: discoverySettings.preferredVibes,
      };
    }

    // Apply boat type filter
    if (query.boatType) {
      whereClause.type = query.boatType;
    } else if (discoverySettings?.preferredBoatTypes && discoverySettings.preferredBoatTypes.length > 0) {
      whereClause.type = {
        in: discoverySettings.preferredBoatTypes,
      };
    }

    // Fetch boats with recent locations
    const nearbyBoats = await prisma.boat.findMany({
      where: whereClause,
      include: {
        captain: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        crew: {
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImage: true,
                  },
                },
              },
            },
          },
        },
        locations: {
          where: {
            isVisible: true,
            recordedAt: {
              gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
          },
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    // Filter by distance and format response
    const boatsWithDistance = nearbyBoats
      .map((boat: any) => {
        const latestLocation = boat.locations[0];
        if (!latestLocation) return null;

        const distance = calculateDistance(
          userLat,
          userLng,
          latestLocation.latitude,
          latestLocation.longitude
        );

        // Skip boats outside radius
        if (distance > searchRadius) return null;

        return {
          id: boat.id,
          name: boat.name,
          type: boat.type,
          currentVibe: boat.currentVibe,
          capacity: boat.capacity,
          description: boat.description,
          amenities: boat.amenities.slice(0, 3), // Only first 3 amenities
          images: boat.images.slice(0, 1), // Only first image
          captain: {
            firstName: boat.captain.profile?.firstName,
            lastName: boat.captain.profile?.lastName,
            profileImage: boat.captain.profile?.profileImage,
          },
          crewCount: boat.crew.length,
          crew: boat.crew.slice(0, 3).map((member: any) => ({
            firstName: member.user.profile?.firstName,
            lastName: member.user.profile?.lastName,
            profileImage: member.user.profile?.profileImage,
          })),
          location: {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            accuracy: latestLocation.accuracy,
            heading: latestLocation.heading,
            speed: latestLocation.speed,
            lastUpdated: latestLocation.recordedAt,
          },
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        };
      })
      .filter((boat: any) => boat !== null)
      .sort((a: any, b: any) => a!.distance - b!.distance); // Sort by distance

    // Log discovery event
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'boats_discovered',
        resourceType: 'BoatLocation',
        details: {
          searchRadius,
          userLocation: {
            latitude: Math.round(userLat * 1000) / 1000,
            longitude: Math.round(userLng * 1000) / 1000,
          },
          boatsFound: boatsWithDistance.length,
          filters: {
            vibe: query.vibe,
            boatType: query.boatType,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        boats: boatsWithDistance,
        searchRadius,
        userLocation: {
          latitude: userLat,
          longitude: userLng,
        },
        totalFound: boatsWithDistance.length,
        filters: {
          vibe: query.vibe,
          boatType: query.boatType,
          appliedFromSettings: {
            vibes: discoverySettings?.preferredVibes || [],
            boatTypes: discoverySettings?.preferredBoatTypes || [],
          },
        },
      },
    });

  } catch (error) {
    console.error('Error finding nearby boats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 