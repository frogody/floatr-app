import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface BlockRequest {
  blockedUserId: string;
  reason?: string;
}

// POST - Block a user
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body: BlockRequest = await request.json();
    const { blockedUserId, reason } = body;

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'Missing required field: blockedUserId' },
        { status: 400 }
      );
    }

    // Get current user
    const blocker = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!blocker) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to block themselves
    if (blocker.id === blockedUserId) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if blocked user exists
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      include: { profile: true },
    });

    if (!blockedUser) {
      return NextResponse.json(
        { error: 'User to block not found' },
        { status: 404 }
      );
    }

    // Check if already blocked
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId: blocker.id,
          blockedUserId: blockedUserId,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json(
        { error: 'User is already blocked' },
        { status: 400 }
      );
    }

    // Create block entry
    const block = await prisma.blockedUser.create({
      data: {
        blockerId: blocker.id,
        blockedUserId: blockedUserId,
        reason: reason || 'No reason provided',
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: blocker.id,
        action: 'user_blocked',
        resourceType: 'BlockedUser',
        resourceId: block.id,
        details: {
          blockedUserId: blockedUserId,
          blockedUserEmail: blockedUser.email,
          reason: reason,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Send internal notification to moderation team
    try {
      if (process.env.EMERGENCY_NOTIFICATION_EMAIL) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: process.env.EMERGENCY_NOTIFICATION_EMAIL }],
                subject: `🚫 User Block Alert - Floatr Moderation`,
              },
            ],
            from: { email: process.env.FROM_EMAIL || 'noreply@floatr.app' },
            content: [
              {
                type: 'text/html',
                value: `
                  <h2 style="color: #dc2626;">🚫 User Block Alert</h2>
                  <p><strong>Blocker:</strong> ${blocker.email} (ID: ${blocker.id})</p>
                  <p><strong>Blocked User:</strong> ${blockedUser.email} (ID: ${blockedUser.id})</p>
                  <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <hr>
                  <p><strong>Action Required:</strong></p>
                  <ul>
                    <li>Review if this indicates a pattern of problematic behavior</li>
                    <li>Consider investigating the blocked user's activity</li>
                    <li>Monitor for escalation or additional reports</li>
                  </ul>
                  <p><em>Block ID: ${block.id}</em></p>
                `,
              },
            ],
          }),
        });
      }
    } catch (notificationError) {
      console.error('Failed to send block notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: {
        blockId: block.id,
        blockedUser: {
          id: blockedUser.id,
          email: blockedUser.email,
          name: blockedUser.profile 
            ? `${blockedUser.profile.firstName} ${blockedUser.profile.lastName}`
            : blockedUser.email,
        },
        createdAt: block.createdAt,
      },
      message: 'User blocked successfully',
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get list of blocked users for current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: user.id },
      include: {
        blocked: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        blockedUsers: blockedUsers.map(block => ({
          blockId: block.id,
          blockedAt: block.createdAt,
          reason: block.reason,
          user: {
            id: block.blocked.id,
            email: block.blocked.email,
            name: block.blocked.profile 
              ? `${block.blocked.profile.firstName} ${block.blocked.profile.lastName}`
              : block.blocked.email,
            profileImage: block.blocked.profile?.profileImage,
          },
        })),
      },
    });

  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockedUserId = searchParams.get('blockedUserId');

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'Missing blockedUserId parameter' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find and delete the block
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId: user.id,
          blockedUserId: blockedUserId,
        },
      },
    });

    if (!existingBlock) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    await prisma.blockedUser.delete({
      where: { id: existingBlock.id },
    });

    // Log the unblock action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user_unblocked',
        resourceType: 'BlockedUser',
        resourceId: existingBlock.id,
        details: {
          unblockedUserId: blockedUserId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User unblocked successfully',
    });

  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 