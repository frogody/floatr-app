import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

interface VeriffSessionRequest {
  callback: string;
  lang: string;
  vendorData: string;
}

interface VeriffSessionResponse {
  status: string;
  verification: {
    id: string;
    url: string;
    vendorData: string;
    host: string;
    status: string;
    sessionToken: string;
  };
}

// Helper function to check if Veriff is configured
const isVeriffConfigured = () => {
  return config.VERIFF_API_KEY && 
         config.VERIFF_SECRET_KEY && 
         !config.VERIFF_API_KEY.includes('placeholder');
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to start verification' },
        { status: 401 }
      );
    }

    // Check if Veriff is configured
    if (!isVeriffConfigured()) {
      return NextResponse.json(
        { 
          error: 'Service Unavailable', 
          message: 'Identity verification service is not configured. Please contact support.',
          configured: false
        },
        { status: 503 }
      );
    }

    // Get current user details
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'Could not retrieve user information' },
        { status: 404 }
      );
    }

    // Prepare Veriff session request
    const veriffRequest: VeriffSessionRequest = {
      callback: config.VERIFF_WEBHOOK_URL || `${request.nextUrl.origin}/api/webhooks/veriff`,
      lang: 'en',
      vendorData: userId, // Store Clerk user ID for webhook processing
    };

    // Call Veriff API to create session
    const veriffResponse = await fetch(`${config.VERIFF_BASE_URL}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': config.VERIFF_API_KEY!,
      },
      body: JSON.stringify(veriffRequest),
    });

    if (!veriffResponse.ok) {
      const errorText = await veriffResponse.text();
      console.error('Veriff API error:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Verification Service Error', 
          message: 'Failed to initialize identity verification. Please try again later.',
          details: veriffResponse.status === 401 ? 'Invalid API credentials' : 'Service temporarily unavailable'
        },
        { status: 500 }
      );
    }

    const veriffSession: VeriffSessionResponse = await veriffResponse.json();

    // Log session creation for audit purposes
    console.log(`Verification session created for user ${userId}:`, {
      sessionId: veriffSession.verification.id,
      timestamp: new Date().toISOString(),
    });

    // Return session URL and metadata
    return NextResponse.json({
      success: true,
      data: {
        sessionId: veriffSession.verification.id,
        sessionUrl: veriffSession.verification.url,
        sessionToken: veriffSession.verification.sessionToken,
        host: veriffSession.verification.host,
        status: veriffSession.verification.status,
      },
      message: 'Verification session created successfully'
    });

  } catch (error) {
    console.error('Error creating verification session:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while setting up verification',
        configured: isVeriffConfigured()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check verification status
export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For MVP, we'll just return configuration status
    // In production, this would query the database for user verification status
    return NextResponse.json({
      success: true,
      data: {
        configured: isVeriffConfigured(),
        userId: userId,
        canStartVerification: isVeriffConfigured(),
      }
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 