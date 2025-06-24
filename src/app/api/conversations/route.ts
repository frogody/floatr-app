import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all active conversations/matches for the current user
export async function GET(_request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user and their boats, also get blocked users
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: {
          where: { isActive: true },
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

    // Get blocked user IDs
    const blockedUserIds = [
      ...user.blocksInitiated.map(block => block.blockedUserId),
      ...user.blocksReceived.map(block => block.blockerId),
    ];

    if (user.ownedBoats.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          conversations: [],
          totalConversations: 0,
        },
      });
    }

    const userBoatIds = user.ownedBoats.map(boat => boat.id);

    // Fetch all matches where user is involved and status is MATCHED, excluding blocked users
    const matches = await prisma.match.findMany({
      where: {
        status: 'MATCHED',
        OR: [
          { likerBoatId: { in: userBoatIds } },
          { likedBoatId: { in: userBoatIds } },
        ],
        // Exclude conversations with blocked users
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
        chatRoom: {
          include: {
            messages: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1, // Get only the latest message
              include: {
                sender: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          chatRoom: {
            lastMessageAt: 'desc',
          },
        },
        {
          matchedAt: 'desc',
        },
      ],
    });

    // Format conversations for frontend
    const conversations = await Promise.all(
      matches.map(async (match) => {
        // Determine user's boat and other boat
        const userBoat = userBoatIds.includes(match.likerBoatId) ? match.likerBoat : match.likedBoat;
        const otherBoat = userBoatIds.includes(match.likerBoatId) ? match.likedBoat : match.likerBoat;

        // Get unread message count for this conversation
        let unreadCount = 0;
        if (match.chatRoom) {
          const unreadMessages = await prisma.message.count({
            where: {
              chatRoomId: match.chatRoom.id,
              senderId: { not: user.id },
              readBy: { not: { has: userBoat.id } },
            },
          });
          unreadCount = unreadMessages;
        }

        // Get the latest message
        const latestMessage = match.chatRoom?.messages[0] || null;

        return {
          matchId: match.id,
          chatRoomId: match.chatRoom?.id || null,
          matchedAt: match.matchedAt,
          lastMessageAt: match.chatRoom?.lastMessageAt || match.matchedAt,
          isActive: match.chatRoom?.isActive ?? true,
          unreadCount,
          userBoat: {
            id: userBoat.id,
            name: userBoat.name,
            type: userBoat.type,
            currentVibe: userBoat.currentVibe,
            images: userBoat.images,
          },
          otherBoat: {
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
          latestMessage: latestMessage ? {
            id: latestMessage.id,
            content: latestMessage.content,
            messageType: latestMessage.messageType,
            createdAt: latestMessage.createdAt,
            senderId: latestMessage.senderId,
            sender: {
              firstName: latestMessage.sender.profile?.firstName,
              lastName: latestMessage.sender.profile?.lastName,
            },
            isOwn: latestMessage.senderId === user.id,
          } : null,
        };
      })
    );

    // Calculate totals
    const totalUnreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        conversations,
        totalConversations: conversations.length,
        totalUnreadMessages,
        user: {
          id: user.id,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          profileImage: user.profile?.profileImage,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 