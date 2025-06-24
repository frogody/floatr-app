import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ matchId: string }>;
}

// GET - Fetch all messages for a specific match/conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { matchId } = await params;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Find user and verify access to this match, also get blocked users
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: true,
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

    // Verify user has access to this match (is captain of one of the boats) and not blocked
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: 'MATCHED',
        OR: [
          { likerBoat: { captainId: user.id } },
          { likedBoat: { captainId: user.id } },
        ],
        // Ensure the other boat's captain is not blocked
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
              include: {
                sender: {
                  include: {
                    profile: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found or access denied' },
        { status: 404 }
      );
    }

    // Determine which boat belongs to current user and which is the other
    const userBoat = match.likerBoat.captainId === user.id ? match.likerBoat : match.likedBoat;
    const otherBoat = match.likerBoat.captainId === user.id ? match.likedBoat : match.likerBoat;

    // Get or create chat room if it doesn't exist
    let chatRoom = match.chatRoom;
    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: {
          matchId: match.id,
          participants: [match.likerBoatId, match.likedBoatId],
          isActive: true,
        },
        include: {
          messages: {
            include: {
              sender: {
                include: {
                  profile: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    // Format messages for frontend
    const formattedMessages = chatRoom.messages.map((message) => ({
      id: message.id,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderId: message.senderId,
      sender: {
        firstName: message.sender.profile?.firstName,
        lastName: message.sender.profile?.lastName,
        profileImage: message.sender.profile?.profileImage,
      },
      readBy: message.readBy,
      isOwn: message.senderId === user.id,
    }));

    // Mark messages as read by current user's boat
    const unreadMessages = chatRoom.messages.filter(
      (message) => 
        message.senderId !== user.id && 
        !message.readBy.includes(userBoat.id)
    );

    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map((message) =>
          prisma.message.update({
            where: { id: message.id },
            data: {
              readBy: {
                push: userBoat.id,
              },
            },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          status: match.status,
          matchedAt: match.matchedAt,
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
              id: otherBoat.captainId,
              firstName: otherBoat.captain.profile?.firstName,
              lastName: otherBoat.captain.profile?.lastName,
              profileImage: otherBoat.captain.profile?.profileImage,
            },
          },
        },
        chatRoom: {
          id: chatRoom.id,
          isActive: chatRoom.isActive,
          lastMessageAt: chatRoom.lastMessageAt,
          participants: chatRoom.participants,
        },
        messages: formattedMessages,
        totalMessages: formattedMessages.length,
        unreadCount: 0, // Now 0 since we marked them as read
      },
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a new message (alternative to WebSocket)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { matchId } = await params;
    const body = await request.json();
    const { content, messageType = 'TEXT' } = body;

    if (!matchId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Match ID and content are required' },
        { status: 400 }
      );
    }

    // Find user and verify access, also get blocked users
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        ownedBoats: true,
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

    // Verify match access and not blocked
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: 'MATCHED',
        OR: [
          { likerBoat: { captainId: user.id } },
          { likedBoat: { captainId: user.id } },
        ],
        // Ensure the other boat's captain is not blocked
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
        chatRoom: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found or access denied' },
        { status: 404 }
      );
    }

    // Get user's boat ID
    const userBoat = await prisma.boat.findFirst({
      where: {
        captainId: user.id,
        OR: [
          { id: match.likerBoatId },
          { id: match.likedBoatId },
        ],
      },
    });

    if (!userBoat) {
      return NextResponse.json(
        { error: 'User boat not found in match' },
        { status: 404 }
      );
    }

    // Get or create chat room
    let chatRoom = match.chatRoom;
    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: {
          matchId: match.id,
          participants: [match.likerBoatId, match.likedBoatId],
          isActive: true,
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        chatRoomId: chatRoom.id,
        senderId: user.id,
        content: content.trim(),
        messageType: messageType,
        readBy: [userBoat.id], // Sender has read their own message
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Update chat room's last message timestamp
    await prisma.chatRoom.update({
      where: { id: chatRoom.id },
      data: { lastMessageAt: new Date() },
    });

    // Format response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: {
        firstName: message.sender.profile?.firstName,
        lastName: message.sender.profile?.lastName,
        profileImage: message.sender.profile?.profileImage,
      },
      readBy: message.readBy,
      isOwn: true,
    };

    return NextResponse.json({
      success: true,
      data: {
        message: formattedMessage,
      },
      message: 'Message sent successfully',
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 