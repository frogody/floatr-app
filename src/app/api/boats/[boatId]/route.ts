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

interface UpdateBoatRequest {
  name?: string;
  type?: keyof typeof BoatType;
  length?: number;
  capacity?: number;
  images?: string[];
  currentVibe?: keyof typeof BoatVibe;
  description?: string;
  amenities?: string[];
  isActive?: boolean;
}

// GET - Retrieve specific boat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boatId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { boatId } = await params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find boat
    const boat = await prisma.boat.findUnique({
      where: { id: boatId },
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
        locations: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!boat) {
      return NextResponse.json(
        { error: 'Boat not found' },
        { status: 404 }
      );
    }

    // Check if user is captain or crew member
    const isCaptain = boat.captainId === user.id;
    const isCrewMember = boat.crew.some((member: any) => member.userId === user.id);

    if (!isCaptain && !isCrewMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        boat,
        isCaptain,
        isCrewMember,
      },
    });

  } catch (error) {
    console.error('Error fetching boat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update boat (Captain only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boatId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { boatId } = await params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find boat and check ownership
    const boat = await prisma.boat.findUnique({
      where: { id: boatId },
      include: {
        captain: true,
      },
    });

    if (!boat) {
      return NextResponse.json(
        { error: 'Boat not found' },
        { status: 404 }
      );
    }

    if (boat.captainId !== user.id) {
      return NextResponse.json(
        { error: 'Only the boat captain can update boat profile' },
        { status: 403 }
      );
    }

    const body: UpdateBoatRequest = await request.json();

    // Prepare update data
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) {
      if (!Object.values(BoatType).includes(body.type)) {
        return NextResponse.json(
          { error: 'Invalid boat type' },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }
    if (body.length !== undefined) {
      if (body.length && (body.length < 1 || body.length > 200)) {
        return NextResponse.json(
          { error: 'Length must be between 1 and 200 meters' },
          { status: 400 }
        );
      }
      updateData.length = body.length;
    }
    if (body.capacity !== undefined) {
      if (body.capacity < 1 || body.capacity > 50) {
        return NextResponse.json(
          { error: 'Capacity must be between 1 and 50 people' },
          { status: 400 }
        );
      }
      updateData.capacity = body.capacity;
    }
    if (body.images !== undefined) updateData.images = body.images;
    if (body.currentVibe !== undefined) {
      if (!Object.values(BoatVibe).includes(body.currentVibe)) {
        return NextResponse.json(
          { error: 'Invalid boat vibe' },
          { status: 400 }
        );
      }
      updateData.currentVibe = body.currentVibe;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amenities !== undefined) updateData.amenities = body.amenities;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Update boat
    const updatedBoat = await prisma.boat.update({
      where: { id: boatId },
      data: updateData,
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
        locations: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    // Log boat update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'boat_updated',
        resourceType: 'Boat',
        resourceId: boatId,
        details: { updatedFields: Object.keys(body) },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBoat,
      message: 'Boat updated successfully',
    });

  } catch (error) {
    console.error('Error updating boat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete boat (Captain only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boatId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { boatId } = await params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find boat and check ownership
    const boat = await prisma.boat.findUnique({
      where: { id: boatId },
    });

    if (!boat) {
      return NextResponse.json(
        { error: 'Boat not found' },
        { status: 404 }
      );
    }

    if (boat.captainId !== user.id) {
      return NextResponse.json(
        { error: 'Only the boat captain can delete boat profile' },
        { status: 403 }
      );
    }

    // Soft delete (set isActive to false)
    await prisma.boat.update({
      where: { id: boatId },
      data: { isActive: false },
    });

    // Log boat deletion
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'boat_deleted',
        resourceType: 'Boat',
        resourceId: boatId,
        details: { boatName: boat.name },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Boat deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting boat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 