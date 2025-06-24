import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

interface ClerkWebhookPayload {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    created_at: number;
    updated_at: number;
  };
  object: string;
  type: string;
}

// Verify webhook signature from Clerk
function verifyClerkWebhook(payload: string, signature: string): boolean {
  try {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return false;
    }

    // Clerk sends signature in format "v1,<timestamp>=<signature>"
    const signatureParts = signature.split(',');
    if (signatureParts.length !== 2) {
      return false;
    }

    const [version, timestampAndSignature] = signatureParts;
    if (version !== 'v1') {
      return false;
    }

    const [timestamp, receivedSignature] = timestampAndSignature.split('=');
    if (!timestamp || !receivedSignature) {
      return false;
    }

    // Create expected signature
    const payloadWithTimestamp = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadWithTimestamp)
      .digest('hex');

    // Compare signatures
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    return timingSafeEqual(receivedBuffer, expectedBuffer);

  } catch (error) {
    console.error('Error verifying Clerk webhook signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get('svix-signature');

    if (!signature) {
      console.error('Missing Clerk webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyClerkWebhook(rawBody, signature)) {
      console.error('Invalid Clerk webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let webhookData: ClerkWebhookPayload;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON in Clerk webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('Clerk webhook received:', {
      type: webhookData.type,
      userId: webhookData.data.id,
      email: webhookData.data.email_addresses[0]?.email_address,
      timestamp: new Date().toISOString(),
    });

    // Handle different webhook types
    switch (webhookData.type) {
      case 'user.created':
        await handleUserCreated(webhookData);
        break;
        
      case 'user.updated':
        await handleUserUpdated(webhookData);
        break;
        
      case 'user.deleted':
        await handleUserDeleted(webhookData);
        break;
        
      default:
        console.log(`Unhandled Clerk webhook type: ${webhookData.type}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      type: webhookData.type,
    });

  } catch (error) {
    console.error('Error processing Clerk webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle user creation
async function handleUserCreated(webhook: ClerkWebhookPayload) {
  try {
    const { data: user } = webhook;
    const primaryEmail = user.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error('No primary email found for user:', user.id);
      return;
    }

    console.log(`Creating user profile for Clerk user: ${user.id}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existingUser) {
      console.log(`User ${user.id} already exists in database`);
      return;
    }

    // Create basic user record
    const newUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: primaryEmail,
        role: 'CREW', // Default role
        verificationStatus: 'PENDING',
        isVerified: false,
        isActive: true,
        // Don't create profile yet - user will complete this later
        discoverySettings: {
          create: {
            maxDistance: 25,
            preferredVibes: ['CHILL'],
            ageRangeMin: 18,
            ageRangeMax: 65,
            preferredBoatTypes: ['SAILBOAT', 'MOTORBOAT', 'YACHT'],
            isDiscoverable: true,
          },
        },
      },
      include: {
        discoverySettings: true,
      },
    });

    // Log user creation
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'user_created',
        resourceType: 'User',
        resourceId: newUser.id,
        details: {
          clerkId: user.id,
          email: primaryEmail,
          source: 'clerk_webhook',
        },
      },
    });

    console.log(`Successfully created user ${newUser.id} for Clerk user ${user.id}`);

  } catch (error) {
    console.error('Error handling user creation:', error);
    throw error;
  }
}

// Handle user updates
async function handleUserUpdated(webhook: ClerkWebhookPayload) {
  try {
    const { data: user } = webhook;
    const primaryEmail = user.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error('No primary email found for user:', user.id);
      return;
    }

    console.log(`Updating user profile for Clerk user: ${user.id}`);

    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!existingUser) {
      console.log(`User ${user.id} not found in database, creating new user`);
      await handleUserCreated(webhook);
      return;
    }

    // Update user email if changed
    if (existingUser.email !== primaryEmail) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: primaryEmail,
        },
      });

      // Log email update
      await prisma.auditLog.create({
        data: {
          userId: existingUser.id,
          action: 'user_email_updated',
          resourceType: 'User',
          resourceId: existingUser.id,
          details: {
            clerkId: user.id,
            oldEmail: existingUser.email,
            newEmail: primaryEmail,
          },
        },
      });

      console.log(`Updated email for user ${existingUser.id}`);
    }

  } catch (error) {
    console.error('Error handling user update:', error);
    throw error;
  }
}

// Handle user deletion
async function handleUserDeleted(webhook: ClerkWebhookPayload) {
  try {
    const { data: user } = webhook;

    console.log(`Handling user deletion for Clerk user: ${user.id}`);

    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!existingUser) {
      console.log(`User ${user.id} not found in database`);
      return;
    }

    // Soft delete user (mark as inactive)
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        isActive: false,
      },
    });

    // Log user deletion
    await prisma.auditLog.create({
      data: {
        userId: existingUser.id,
        action: 'user_deleted',
        resourceType: 'User',
        resourceId: existingUser.id,
        details: {
          clerkId: user.id,
          email: existingUser.email,
          source: 'clerk_webhook',
        },
      },
    });

    console.log(`Successfully soft-deleted user ${existingUser.id}`);

  } catch (error) {
    console.error('Error handling user deletion:', error);
    throw error;
  }
}

// GET endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({
    message: 'Clerk webhook endpoint',
    timestamp: new Date().toISOString(),
  });
} 