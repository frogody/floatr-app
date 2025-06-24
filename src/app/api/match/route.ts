import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// SwipeType enum for type checking
const SwipeType = {
  LIKE: 'LIKE',
  PASS: 'PASS'
} as const;

const MatchStatus = {
  PENDING: 'PENDING',
  MATCHED: 'MATCHED',
  EXPIRED: 'EXPIRED'
} as const;

interface MatchRequest {
  boatId: string;        // Boat that is performing the action
  targetBoatId: string;  // Boat being swiped on
  action: 'LIKE' | 'PASS';
}

// POST - Record a swipe action and check for matches
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: MatchRequest = await request.json();
    const { boatId, targetBoatId, action } = body;

    // Validation
    if (!boatId || !targetBoatId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: boatId, targetBoatId, action' },
        { status: 400 }
      );
    }

    if (boatId === targetBoatId) {
      return NextResponse.json(
        { error: 'Cannot swipe on your own boat' },
        { status: 400 }
      );
    }

    if (!Object.values(SwipeType).includes(action as 'LIKE' | 'PASS')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be LIKE or PASS' },
        { status: 400 }
      );
    }

    // Find user and verify boat ownership, also get blocked users
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: {
          where: { id: boatId, isActive: true },
        },
        blocksInitiated: { select: { blockedUserId: true } },
        blocksReceived: { select: { blockerId: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userBoat = user.ownedBoats[0];
    if (!userBoat) {
      return NextResponse.json(
        { error: 'Boat not found or you are not the captain' },
        { status: 404 }
      );
    }

    // Verify target boat exists and is active
    const targetBoat = await prisma.boat.findUnique({
      where: { id: targetBoatId },
      include: {
        captain: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!targetBoat || !targetBoat.isActive) {
      return NextResponse.json(
        { error: 'Target boat not found or inactive' },
        { status: 404 }
      );
    }

    // Check if users have blocked each other
    const blockedUserIds = [
      ...user.blocksInitiated.map(block => block.blockedUserId),
      ...user.blocksReceived.map(block => block.blockerId),
    ];

    if (blockedUserIds.includes(targetBoat.captainId)) {
      return NextResponse.json(
        { error: 'Cannot interact with this user' },
        { status: 403 }
      );
    }

    // Check if action already exists
    const existingSwipe = await prisma.swipeAction.findUnique({
      where: {
        swipeByBoatId_swipeOnBoatId: {
          swipeByBoatId: boatId,
          swipeOnBoatId: targetBoatId,
        },
      },
    });

    if (existingSwipe) {
      return NextResponse.json(
        { error: 'You have already swiped on this boat' },
        { status: 409 }
      );
    }

    // Record the swipe action
    const swipeAction = await prisma.swipeAction.create({
      data: {
        swipeByBoatId: boatId,
        swipeOnBoatId: targetBoatId,
        action: action as 'LIKE' | 'PASS',
      },
    });

    let matchResult = null;
    let isMatch = false;

    // If it's a LIKE, check for mutual match
    if (action === 'LIKE') {
      // Check if target boat has already liked this boat
      const mutualLike = await prisma.swipeAction.findUnique({
        where: {
          swipeByBoatId_swipeOnBoatId: {
            swipeByBoatId: targetBoatId,
            swipeOnBoatId: boatId,
          },
        },
      });

      if (mutualLike && mutualLike.action === 'LIKE') {
        // It's a match! Create match record
        const match = await prisma.match.create({
          data: {
            likerBoatId: boatId,
            likedBoatId: targetBoatId,
            status: MatchStatus.MATCHED,
            matchedAt: new Date(),
          },
        });

        // Also create the reverse match for consistency
        await prisma.match.upsert({
          where: {
            likerBoatId_likedBoatId: {
              likerBoatId: targetBoatId,
              likedBoatId: boatId,
            },
          },
          update: {
            status: MatchStatus.MATCHED,
            matchedAt: new Date(),
          },
          create: {
            likerBoatId: targetBoatId,
            likedBoatId: boatId,
            status: MatchStatus.MATCHED,
            matchedAt: new Date(),
          },
        });

        matchResult = {
          id: match.id,
          status: MatchStatus.MATCHED,
          matchedAt: match.matchedAt,
          targetBoat: {
            id: targetBoat.id,
            name: targetBoat.name,
            type: targetBoat.type,
            currentVibe: targetBoat.currentVibe,
            images: targetBoat.images,
            captain: {
              firstName: targetBoat.captain.profile?.firstName,
              lastName: targetBoat.captain.profile?.lastName,
              profileImage: targetBoat.captain.profile?.profileImage,
            },
          },
        };
        isMatch = true;
      } else {
        // Create pending match (waiting for reciprocation)
        await prisma.match.create({
          data: {
            likerBoatId: boatId,
            likedBoatId: targetBoatId,
            status: MatchStatus.PENDING,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `swipe_${action.toLowerCase()}`,
        resourceType: 'SwipeAction',
        resourceId: swipeAction.id,
        details: {
          fromBoatId: boatId,
          toBoatId: targetBoatId,
          action,
          isMatch,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        swipeAction: {
          id: swipeAction.id,
          action: swipeAction.action,
          createdAt: swipeAction.createdAt,
        },
        isMatch,
        match: matchResult,
      },
      message: isMatch ? "It's a match!" : `${action} recorded successfully`,
    });

  } catch (error) {
    console.error('Error processing swipe action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get match history for a boat
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
    const boatId = searchParams.get('boatId');

    if (!boatId) {
      return NextResponse.json(
        { error: 'Missing boatId parameter' },
        { status: 400 }
      );
    }

    // Verify boat ownership and get blocked users
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: {
          where: { id: boatId, isActive: true },
        },
        blocksInitiated: { select: { blockedUserId: true } },
        blocksReceived: { select: { blockerId: true } },
      },
    });

    if (!user || user.ownedBoats.length === 0) {
      return NextResponse.json(
        { error: 'Boat not found or access denied' },
        { status: 404 }
      );
    }

    // Get blocked user IDs
    const blockedUserIds = [
      ...user.blocksInitiated.map(block => block.blockedUserId),
      ...user.blocksReceived.map(block => block.blockerId),
    ];

    // Get all matches for this boat, excluding blocked users
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { likerBoatId: boatId },
          { likedBoatId: boatId },
        ],
        status: MatchStatus.MATCHED,
        // Exclude matches where the captain is blocked
        likerBoat: {
          captainId: {
            notIn: blockedUserIds,
          },
        },
        likedBoat: {
          captainId: {
            notIn: blockedUserIds,
          },
        },
      },
      include: {
        likerBoat: {
          include: {
            captain: {
              include: {
                profile: true,
              },
            },
          },
        },
        likedBoat: {
          include: {
            captain: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        matchedAt: 'desc',
      },
    });

    const formattedMatches = matches.map((match) => {
      const otherBoat = match.likerBoatId === boatId ? match.likedBoat : match.likerBoat;
      
      return {
        id: match.id,
        matchedAt: match.matchedAt,
        boat: {
          id: otherBoat.id,
          name: otherBoat.name,
          type: otherBoat.type,
          currentVibe: otherBoat.currentVibe,
          images: otherBoat.images,
          captain: {
            firstName: otherBoat.captain.profile?.firstName,
            lastName: otherBoat.captain.profile?.lastName,
            profileImage: otherBoat.captain.profile?.profileImage,
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        matches: formattedMatches,
        totalMatches: formattedMatches.length,
      },
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 