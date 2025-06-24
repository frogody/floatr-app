import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  isVisible?: boolean;
}

// POST - Update user's current location
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: LocationUpdateRequest = await request.json();
    const {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      isVisible = true,
    } = body;

    // Validation
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: latitude, longitude' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude: must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude: must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { 
        ownedBoats: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Users must have at least one active boat to share location
    if (user.ownedBoats.length === 0) {
      return NextResponse.json(
        { error: 'No active boats found. Create a boat profile to share your location.' },
        { status: 403 }
      );
    }

    // Update location for all active boats owned by this user
    const locationUpdates = await Promise.all(
      user.ownedBoats.map(async (boat: any) => {
        return prisma.boatLocation.create({
          data: {
            boatId: boat.id,
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
            isVisible,
          },
        });
      })
    );

    // Clean up old location records (keep only last 10 per boat)
    for (const boat of user.ownedBoats) {
      const oldLocations = await prisma.boatLocation.findMany({
        where: { boatId: boat.id },
        orderBy: { recordedAt: 'desc' },
        skip: 10,
      });

      if (oldLocations.length > 0) {
        await prisma.boatLocation.deleteMany({
          where: {
            id: {
              in: oldLocations.map((loc: any) => loc.id),
            },
          },
        });
      }
    }

    // Log location update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'location_updated',
        resourceType: 'BoatLocation',
        details: {
          boatCount: user.ownedBoats.length,
          latitude: Math.round(latitude * 1000) / 1000, // Rounded for privacy
          longitude: Math.round(longitude * 1000) / 1000,
          accuracy,
          isVisible,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        locationsUpdated: locationUpdates.length,
        boats: user.ownedBoats.map((boat: any) => ({
          id: boat.id,
          name: boat.name,
          type: boat.type,
          currentVibe: boat.currentVibe,
        })),
      },
      message: 'Location updated successfully',
    });

  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's current location
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user and their boats' latest locations
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: {
          where: { isActive: true },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format response with latest locations
    const boatsWithLocations = user.ownedBoats.map((boat: any) => ({
      id: boat.id,
      name: boat.name,
      type: boat.type,
      currentVibe: boat.currentVibe,
      capacity: boat.capacity,
      currentLocation: boat.locations[0] || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        boats: boatsWithLocations,
        hasActiveBoats: user.ownedBoats.length > 0,
      },
    });

  } catch (error) {
    console.error('Error fetching user location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 