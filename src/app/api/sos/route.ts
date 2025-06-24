import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

interface SOSRequest {
  message?: string;
  boatId?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// POST - Create SOS Emergency Alert
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required for SOS alerts' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SOSRequest = await request.json();
    const { message: customMessage, boatId, coordinates } = body;

    // Get user with emergency contact information
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        profile: true,
        ownedBoats: {
          where: { 
            ...(boatId ? { id: boatId } : {}),
            isActive: true 
          },
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

    // Determine boat and location to use
    let targetBoat = user.ownedBoats[0];
    let location = coordinates;

    if (!targetBoat) {
      return NextResponse.json(
        { error: 'No active boat found for SOS alert' },
        { status: 400 }
      );
    }

    // Use boat's latest location if coordinates not provided
    if (!location && targetBoat.locations.length > 0) {
      const latestLocation = targetBoat.locations[0];
      location = {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
      };
    }

    if (!location) {
      return NextResponse.json(
        { error: 'No location data available for SOS alert' },
        { status: 400 }
      );
    }

    // Create SOS alert record
    const sosAlert = await prisma.sOSAlert.create({
      data: {
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        message: customMessage || 'Emergency assistance requested',
        status: 'ACTIVE',
      },
    });

    // Prepare emergency information
    const userName = user.profile 
      ? `${user.profile.firstName} ${user.profile.lastName}` 
      : user.email;
    const googleMapsLink = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    const timeStamp = new Date().toLocaleString();
    
    // Base SOS message
    const sosMessage = `🚨 SOS EMERGENCY ALERT from Floatr user ${userName}. 
    
Boat: "${targetBoat.name}" (${targetBoat.type})
Last known location: ${googleMapsLink}
Time: ${timeStamp}
${customMessage ? `Message: "${customMessage}"` : ''}

Please check immediately if everything is okay. If you cannot reach them, contact emergency services immediately.

This is an automated alert from Floatr Safety System.`;

    const results = {
      sosAlert: {
        id: sosAlert.id,
        createdAt: sosAlert.createdAt,
      },
      notifications: {
        sms: null as any,
        internal: null as any,
      },
      errors: [] as string[],
    };

    // 1. Send SMS to Emergency Contact
    if (user.emergencyContactPhone && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsResponse = await twilioClient.messages.create({
          body: sosMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.emergencyContactPhone,
        });

        results.notifications.sms = {
          sid: smsResponse.sid,
          status: smsResponse.status,
          to: user.emergencyContactPhone,
          sentAt: new Date().toISOString(),
        };

        console.log(`SOS SMS sent successfully to ${user.emergencyContactPhone}: ${smsResponse.sid}`);
      } catch (twilioError) {
        console.error('Twilio SMS Error:', twilioError);
        results.errors.push(`Failed to send SMS: ${twilioError}`);
      }
    } else {
      results.errors.push('No emergency contact phone number or Twilio not configured');
    }

    // 2. Send Internal Notification to Emergency Response Team
    try {
      // Send email notification (using fetch to email service)
      if (process.env.SENDGRID_API_KEY && process.env.EMERGENCY_NOTIFICATION_EMAIL) {
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: process.env.EMERGENCY_NOTIFICATION_EMAIL }],
                subject: `🚨 SOS ALERT - Floatr User Emergency: ${userName}`,
              },
            ],
            from: { email: process.env.FROM_EMAIL || 'noreply@floatr.app' },
            content: [
              {
                type: 'text/html',
                value: `
                  <h2 style="color: #dc2626;">🚨 EMERGENCY SOS ALERT</h2>
                  <p><strong>User:</strong> ${userName} (${user.email})</p>
                  <p><strong>User ID:</strong> ${user.id}</p>
                  <p><strong>Boat:</strong> "${targetBoat.name}" (${targetBoat.type})</p>
                  <p><strong>Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
                  <p><strong>Coordinates:</strong> ${location.latitude}, ${location.longitude}</p>
                  <p><strong>Time:</strong> ${timeStamp}</p>
                  <p><strong>Emergency Contact:</strong> ${user.emergencyContactName || 'Not set'} (${user.emergencyContactPhone || 'Not set'})</p>
                  ${customMessage ? `<p><strong>Message:</strong> "${customMessage}"</p>` : ''}
                  <hr>
                  <p><strong>Action Required:</strong></p>
                  <ul>
                    <li>Monitor for follow-up alerts</li>
                    <li>Contact user if needed: ${user.email}</li>
                    <li>Contact emergency contact if provided</li>
                    <li>Coordinate with local authorities if necessary</li>
                  </ul>
                  <p><em>Alert ID: ${sosAlert.id}</em></p>
                `,
              },
            ],
          }),
        });

        if (emailResponse.ok) {
          results.notifications.internal = {
            type: 'email',
            status: 'sent',
            sentAt: new Date().toISOString(),
          };
        } else {
          throw new Error(`Email API error: ${emailResponse.status}`);
        }
      }

      // Send Slack notification (if webhook configured)
      if (process.env.EMERGENCY_SLACK_WEBHOOK) {
        const slackPayload = {
          text: `🚨 SOS EMERGENCY ALERT`,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'User', value: `${userName} (${user.email})`, short: true },
                { title: 'Boat', value: `"${targetBoat.name}" (${targetBoat.type})`, short: true },
                { title: 'Location', value: `<${googleMapsLink}|View on Maps>`, short: true },
                { title: 'Time', value: timeStamp, short: true },
                { title: 'Emergency Contact', value: user.emergencyContactPhone || 'Not set', short: true },
                { title: 'Alert ID', value: sosAlert.id, short: true },
              ],
              actions: [
                {
                  type: 'button',
                  text: 'View Location',
                  url: googleMapsLink,
                  style: 'primary',
                },
              ],
            },
          ],
        };

        const slackResponse = await fetch(process.env.EMERGENCY_SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        if (slackResponse.ok) {
          results.notifications.internal = {
            ...results.notifications.internal,
            slack: 'sent',
          };
        }
      }

    } catch (internalError) {
      console.error('Internal notification error:', internalError);
      results.errors.push(`Internal notification failed: ${internalError}`);
    }

    // 3. Log to audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'sos_alert_created',
        resourceType: 'SOSAlert',
        resourceId: sosAlert.id,
        details: {
          boatId: targetBoat.id,
          boatName: targetBoat.name,
          location: location,
          emergencyContact: user.emergencyContactPhone,
          customMessage: customMessage,
          notificationResults: results.notifications,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        alertId: sosAlert.id,
        status: 'ACTIVE',
        location: location,
        notifications: results.notifications,
        boat: {
          id: targetBoat.id,
          name: targetBoat.name,
          type: targetBoat.type,
        },
        user: {
          name: userName,
          emergencyContact: user.emergencyContactPhone ? {
            name: user.emergencyContactName,
            phone: user.emergencyContactPhone,
            relation: user.emergencyContactRelation,
          } : null,
        },
      },
      message: 'SOS alert created successfully. Emergency services have been notified.',
      errors: results.errors.length > 0 ? results.errors : undefined,
    });

  } catch (error) {
    console.error('SOS Alert Error:', error);
    
    // Even if there's an error, try to log it
    try {
      const { userId: clerkId } = await auth();
      if (clerkId) {
        const user = await prisma.user.findUnique({ where: { clerkId } });
        if (user) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'sos_alert_failed',
              resourceType: 'SOSAlert',
              details: {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
            },
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log SOS error:', logError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to create SOS alert', 
        details: error instanceof Error ? error.message : 'Unknown error',
        emergency: 'If this is a real emergency, call local emergency services immediately: 911 (US), 112 (EU), or your local emergency number.'
      },
      { status: 500 }
    );
  }
}

// GET - Get active SOS alerts for user (for status checking)
export async function GET(request: NextRequest) {
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

    // Get active SOS alerts for this user
    const activeAlerts = await prisma.sOSAlert.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        activeAlerts: activeAlerts.map(alert => ({
          id: alert.id,
          message: alert.message,
          location: {
            latitude: alert.latitude,
            longitude: alert.longitude,
          },
          status: alert.status,
          createdAt: alert.createdAt,
        })),
        hasActiveAlerts: activeAlerts.length > 0,
      },
    });

  } catch (error) {
    console.error('Error fetching SOS alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 