import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
const BoatType = {
  SAILBOAT: 'SAILBOAT',
  MOTORBOAT: 'MOTORBOAT', 
  YACHT: 'YACHT',
  CATAMARAN: 'CATAMARAN',
  SPEEDBOAT: 'SPEEDBOAT',
  OTHER: 'OTHER'
} as const;

const BoatVibe = {
  PARTY: 'PARTY',
  CHILL: 'CHILL',
  PRIVATE: 'PRIVATE',
  FAMILY: 'FAMILY',
  ADVENTURE: 'ADVENTURE'
} as const;

const UserRole = {
  CAPTAIN: 'CAPTAIN',
  CREW: 'CREW'
} as const;

interface CreateBoatRequest {
  name: string;
  type: keyof typeof BoatType;
  length?: number;
  capacity: number;
  images?: string[];
  currentVibe: keyof typeof BoatVibe;
  description?: string;
  amenities?: string[];
}

// GET - Retrieve boats (user's own boats)
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: {
          include: {
            crew: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            locations: {
              orderBy: {
                recordedAt: 'desc',
              },
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

    return NextResponse.json({
      success: true,
      data: {
        boats: user.ownedBoats,
        isCaptain: user.role === 'CAPTAIN',
      },
    });

  } catch (error) {
    console.error('Error fetching boats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new boat (Captain only)
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user and check if they're a captain
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== UserRole.CAPTAIN) {
      return NextResponse.json(
        { error: 'Only captains can create boat profiles' },
        { status: 403 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Identity verification required to create boat profile' },
        { status: 403 }
      );
    }

    const body: CreateBoatRequest = await request.json();
    const {
      name,
      type,
      length,
      capacity,
      images = [],
      currentVibe,
      description,
      amenities = [],
    } = body;

    // Validation
    if (!name || !type || !capacity || !currentVibe) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, capacity, currentVibe' },
        { status: 400 }
      );
    }

    if (capacity < 1 || capacity > 50) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 50 people' },
        { status: 400 }
      );
    }

    if (length && (length < 1 || length > 200)) {
      return NextResponse.json(
        { error: 'Length must be between 1 and 200 meters' },
        { status: 400 }
      );
    }

    // Validate boat type
    if (!Object.values(BoatType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid boat type' },
        { status: 400 }
      );
    }

    // Validate boat vibe
    if (!Object.values(BoatVibe).includes(currentVibe)) {
      return NextResponse.json(
        { error: 'Invalid boat vibe' },
        { status: 400 }
      );
    }

    // Create boat
    const boat = await prisma.boat.create({
      data: {
        name,
        type,
        length,
        capacity,
        images,
        currentVibe,
        description,
        amenities,
        captainId: user.id,
      },
      include: {
        captain: {
          include: {
            profile: true,
          },
        },
        crew: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Log boat creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'boat_created',
        resourceType: 'Boat',
        resourceId: boat.id,
        details: { boatName: name, type, capacity, currentVibe },
      },
    });

    return NextResponse.json({
      success: true,
      data: boat,
      message: 'Boat created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating boat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 