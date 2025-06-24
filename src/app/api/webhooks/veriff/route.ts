import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';

interface VeriffWebhookPayload {
  id: string;
  feature: string;
  code: number;
  action: string;
  vendorData: string;
  verification: {
    id: string;
    code: number;
    person: {
      firstName?: string;
      lastName?: string;
      idNumber?: string;
    };
    document?: {
      number?: string;
      type?: string;
      country?: string;
    };
    status: string;
    acceptanceTime?: string;
  };
}

// Verify webhook signature from Veriff
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Veriff sends signature in format "sha256=<hash>"
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Helper function to check if Veriff is configured
const isVeriffConfigured = () => {
  return config.VERIFF_API_KEY && 
         config.VERIFF_SECRET_KEY && 
         !config.VERIFF_API_KEY.includes('placeholder');
};

export async function POST(request: NextRequest) {
  try {
    // Check if Veriff is configured
    if (!isVeriffConfigured()) {
      console.log('Veriff webhook received but service not configured');
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hmac-signature');

    if (!signature) {
      console.error('Missing webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, config.VERIFF_SECRET_KEY!)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let webhookData: VeriffWebhookPayload;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log received webhook for debugging
    console.log('Veriff webhook received:', {
      action: webhookData.action,
      feature: webhookData.feature,
      verificationId: webhookData.verification?.id,
      vendorData: webhookData.vendorData,
      status: webhookData.verification?.status,
      timestamp: new Date().toISOString(),
    });

    // Extract user ID from vendorData (Clerk user ID)
    const userId = webhookData.vendorData;
    if (!userId) {
      console.error('No vendor data (user ID) in webhook');
      return NextResponse.json(
        { error: 'Missing user identifier' },
        { status: 400 }
      );
    }

    // Process different webhook actions
    switch (webhookData.action) {
      case 'verification.approved':
        await handleVerificationApproved(webhookData, userId);
        break;
        
      case 'verification.declined':
        await handleVerificationDeclined(webhookData, userId);
        break;
        
      case 'verification.resubmitted':
        await handleVerificationResubmitted(webhookData, userId);
        break;
        
      case 'verification.expired':
        await handleVerificationExpired(webhookData, userId);
        break;
        
      default:
        console.log(`Unhandled webhook action: ${webhookData.action}`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      action: webhookData.action
    });

  } catch (error) {
    console.error('Error processing Veriff webhook:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle successful verification
async function handleVerificationApproved(webhook: VeriffWebhookPayload, userId: string) {
  try {
    console.log(`Verification approved for user ${userId}`);
    
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { verificationData: true },
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return;
    }

    // Update user verification status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationStatus: 'VERIFIED',
      },
    });

    // Update or create verification data
    await prisma.verificationData.upsert({
      where: { userId: user.id },
      update: {
        status: 'VERIFIED',
        verificationResult: webhook.verification,
        processedAt: new Date(),
      },
      create: {
        userId: user.id,
        documentType: webhook.verification?.document?.type || 'unknown',
        documentImages: [],
        status: 'VERIFIED',
        verificationResult: webhook.verification,
        processedAt: new Date(),
      },
    });

    // Log verification approval
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'verification_approved',
        resourceType: 'VerificationData',
        details: { 
          verificationId: webhook.verification.id, 
          action: webhook.action,
          document: webhook.verification.document,
          person: webhook.verification.person,
        },
      },
    });

    console.log(`User ${user.id} verification status updated to VERIFIED`);
    
  } catch (error) {
    console.error('Error handling verification approval:', error);
    throw error;
  }
}

// Handle declined verification
async function handleVerificationDeclined(webhook: VeriffWebhookPayload, userId: string) {
  try {
    console.log(`Verification declined for user ${userId}`);
    
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { verificationData: true },
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return;
    }

    // Update user verification status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: false,
        verificationStatus: 'REJECTED',
      },
    });

    // Update or create verification data
    await prisma.verificationData.upsert({
      where: { userId: user.id },
      update: {
        status: 'REJECTED',
        verificationResult: webhook.verification,
        processedAt: new Date(),
      },
      create: {
        userId: user.id,
        documentType: webhook.verification?.document?.type || 'unknown',
        documentImages: [],
        status: 'REJECTED',
        verificationResult: webhook.verification,
        processedAt: new Date(),
      },
    });

    // Log verification decline
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'verification_declined',
        resourceType: 'VerificationData',
        details: { 
          verificationId: webhook.verification.id,
          action: webhook.action,
          code: webhook.verification.code,
          reason: webhook.verification.status,
        },
      },
    });

    console.log(`User ${user.id} verification status updated to REJECTED`);
    
  } catch (error) {
    console.error('Error handling verification decline:', error);
    throw error;
  }
}

// Handle resubmitted verification
async function handleVerificationResubmitted(webhook: VeriffWebhookPayload, userId: string) {
  try {
    console.log(`Verification resubmitted for user ${userId}`);
    
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { verificationData: true },
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return;
    }

    // Update user verification status back to pending
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: false,
        verificationStatus: 'PENDING',
      },
    });

    // Update verification data
    if (user.verificationData) {
      await prisma.verificationData.update({
        where: { userId: user.id },
        data: {
          status: 'PENDING',
          verificationResult: webhook.verification,
          processedAt: null,
        },
      });
    }

    // Log verification resubmission
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'verification_resubmitted',
        resourceType: 'VerificationData',
        details: { 
          verificationId: webhook.verification.id, 
          action: webhook.action,
        },
      },
    });

    console.log(`User ${user.id} verification status updated to PENDING (resubmitted)`);
    
  } catch (error) {
    console.error('Error handling verification resubmission:', error);
    throw error;
  }
}

// Handle expired verification
async function handleVerificationExpired(webhook: VeriffWebhookPayload, userId: string) {
  try {
    console.log(`Verification expired for user ${userId}`);
    
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { verificationData: true },
    });

    if (!user) {
      console.error('User not found for Clerk ID:', userId);
      return;
    }

    // Update user verification status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: false,
        verificationStatus: 'EXPIRED',
      },
    });

    // Update verification data
    if (user.verificationData) {
      await prisma.verificationData.update({
        where: { userId: user.id },
        data: {
          status: 'EXPIRED',
          verificationResult: webhook.verification,
          processedAt: new Date(),
        },
      });
    }

    // Log verification expiration
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'verification_expired',
        resourceType: 'VerificationData',
        details: { 
          verificationId: webhook.verification.id, 
          action: webhook.action,
        },
      },
    });

    console.log(`User ${user.id} verification status updated to EXPIRED`);
    
  } catch (error) {
    console.error('Error handling verification expiration:', error);
    throw error;
  }
}

// GET endpoint for webhook URL verification (some services require this)
export async function GET() {
  return NextResponse.json({
    message: 'Veriff webhook endpoint',
    timestamp: new Date().toISOString(),
  });
} 