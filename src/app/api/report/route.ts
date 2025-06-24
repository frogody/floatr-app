import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface ReportRequest {
  reportedUserId: string;
  reportedBoatId?: string;
  reportedMessageId?: string;
  reportType: 'USER_PROFILE' | 'BOAT_PROFILE' | 'MESSAGE';
  reason: 'INAPPROPRIATE_BEHAVIOR' | 'HARASSMENT' | 'FAKE_PROFILE' | 'SAFETY_CONCERN' | 'SPAM' | 'OTHER';
  description: string;
  evidence?: string[];
}

// POST - Create a report
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body: ReportRequest = await request.json();
    const {
      reportedUserId,
      reportedBoatId,
      reportedMessageId,
      reportType,
      reason,
      description,
      evidence = [],
    } = body;

    // Validation
    if (!reportedUserId || !reportType || !reason || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: reportedUserId, reportType, reason, description' },
        { status: 400 }
      );
    }

    // Get reporter user
    const reporter = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    });

    if (!reporter) {
      return NextResponse.json(
        { error: 'Reporter user not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to report themselves
    if (reporter.id === reportedUserId) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      );
    }

    // Get reported user
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
      include: { profile: true },
    });

    if (!reportedUser) {
      return NextResponse.json(
        { error: 'Reported user not found' },
        { status: 404 }
      );
    }

    // Additional validations based on report type
    let reportedBoat = null;
    let reportedMessage = null;

    if (reportType === 'BOAT_PROFILE' && reportedBoatId) {
      reportedBoat = await prisma.boat.findUnique({
        where: { id: reportedBoatId },
      });

      if (!reportedBoat) {
        return NextResponse.json(
          { error: 'Reported boat not found' },
          { status: 404 }
        );
      }
    }

    if (reportType === 'MESSAGE' && reportedMessageId) {
      reportedMessage = await prisma.message.findUnique({
        where: { id: reportedMessageId },
        include: { chatRoom: true },
      });

      if (!reportedMessage) {
        return NextResponse.json(
          { error: 'Reported message not found' },
          { status: 404 }
        );
      }

      // Verify reporter has access to this message (is in the chat room)
      if (!reportedMessage.chatRoom.participants.includes(reporter.id)) {
        return NextResponse.json(
          { error: 'You can only report messages from chats you participate in' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate reports (same reporter, same target, same type within 24 hours)
    const recentReport = await prisma.report.findFirst({
      where: {
        reporterId: reporter.id,
        reportedUserId: reportedUserId,
        reportType: reportType,
        ...(reportedBoatId && { reportedBoatId }),
        ...(reportedMessageId && { reportedMessageId }),
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    if (recentReport) {
      return NextResponse.json(
        { error: 'You have already reported this content recently. Please wait before submitting another report.' },
        { status: 400 }
      );
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: reporter.id,
        reportedUserId: reportedUserId,
        reportedBoatId,
        reportedMessageId,
        reportType,
        reason,
        description,
        evidence,
        status: 'PENDING',
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: reporter.id,
        action: 'report_created',
        resourceType: 'Report',
        resourceId: report.id,
        details: {
          reportType,
          reason,
          reportedUserId,
          reportedBoatId,
          reportedMessageId,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Send internal notification to moderation team
    try {
      const reporterName = reporter.profile 
        ? `${reporter.profile.firstName} ${reporter.profile.lastName}`
        : reporter.email;
      
      const reportedName = reportedUser.profile 
        ? `${reportedUser.profile.firstName} ${reportedUser.profile.lastName}`
        : reportedUser.email;

      // Email notification
      if (process.env.SENDGRID_API_KEY && process.env.EMERGENCY_NOTIFICATION_EMAIL) {
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
                subject: `🚨 User Report Alert - ${reportType} - ${reason}`,
              },
            ],
            from: { email: process.env.FROM_EMAIL || 'noreply@floatr.app' },
            content: [
              {
                type: 'text/html',
                value: `
                  <h2 style="color: #dc2626;">🚨 User Report Alert</h2>
                  <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #991b1b;">Report Details</h3>
                    <p><strong>Report Type:</strong> ${reportType}</p>
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p><strong>Description:</strong> "${description}"</p>
                  </div>
                  
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #374151;">Involved Users</h3>
                    <p><strong>Reporter:</strong> ${reporterName} (${reporter.email})</p>
                    <p><strong>Reported User:</strong> ${reportedName} (${reportedUser.email})</p>
                    ${reportedBoat ? `<p><strong>Reported Boat:</strong> "${reportedBoat.name}" (${reportedBoat.type})</p>` : ''}
                    ${reportedMessage ? `<p><strong>Message Content:</strong> "${reportedMessage.content}"</p>` : ''}
                  </div>

                  ${evidence.length > 0 ? `
                  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #92400e;">Evidence</h3>
                    <ul>
                      ${evidence.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                  </div>
                  ` : ''}

                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #1e40af;">Action Required</h3>
                    <ul>
                      <li>Review the reported content immediately</li>
                      <li>Investigate both users' interaction history</li>
                      <li>Take appropriate moderation action</li>
                      <li>Update report status in admin panel</li>
                      <li>Consider notifying the reported user if action is taken</li>
                    </ul>
                  </div>

                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <p><em>Report ID: ${report.id}</em></p>
                `,
              },
            ],
          }),
        });
      }

      // Slack notification
      if (process.env.EMERGENCY_SLACK_WEBHOOK) {
        const slackPayload = {
          text: `🚨 New ${reportType} Report: ${reason}`,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Reporter', value: `${reporterName} (${reporter.email})`, short: true },
                { title: 'Reported User', value: `${reportedName} (${reportedUser.email})`, short: true },
                { title: 'Type', value: reportType, short: true },
                { title: 'Reason', value: reason, short: true },
                { title: 'Description', value: description, short: false },
                { title: 'Report ID', value: report.id, short: true },
                { title: 'Time', value: new Date().toLocaleString(), short: true },
              ],
            },
          ],
        };

        await fetch(process.env.EMERGENCY_SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });
      }

    } catch (notificationError) {
      console.error('Failed to send report notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        status: report.status,
        reportType: report.reportType,
        reason: report.reason,
        createdAt: report.createdAt,
        message: 'Thank you for your report. Our moderation team will review it shortly.',
      },
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's submitted reports
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

    const reports = await prisma.report.findMany({
      where: { reporterId: user.id },
      include: {
        reportedUser: {
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
        reports: reports.map(report => ({
          id: report.id,
          reportType: report.reportType,
          reason: report.reason,
          description: report.description,
          status: report.status,
          createdAt: report.createdAt,
          resolvedAt: report.resolvedAt,
          reportedUser: {
            id: report.reportedUser.id,
            name: report.reportedUser.profile 
              ? `${report.reportedUser.profile.firstName} ${report.reportedUser.profile.lastName}`
              : report.reportedUser.email,
          },
        })),
      },
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 