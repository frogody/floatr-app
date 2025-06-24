import { prisma } from '@/lib/prisma';

// Perspective API configuration
const PERSPECTIVE_API_ENDPOINT = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const API_KEY = process.env.PERSPECTIVE_API_KEY || process.env.GOOGLE_API_KEY;

// Toxicity thresholds for different actions
const TOXICITY_THRESHOLDS = {
  FLAG: 0.8,           // Auto-flag and report
  WARNING: 0.6,        // Log for monitoring
  MONITOR: 0.4,        // Basic monitoring
} as const;

// Attributes to analyze
const ANALYZED_ATTRIBUTES = [
  'TOXICITY',
  'SEVERE_TOXICITY', 
  'IDENTITY_ATTACK',
  'INSULT',
  'PROFANITY',
  'THREAT',
  'HARASSMENT',
] as const;

interface PerspectiveRequest {
  comment: {
    text: string;
  };
  requestedAttributes: Record<string, { scoreType: string }>;
  languages: string[];
  doNotStore: boolean;
}

interface PerspectiveAttributeScore {
  summaryScore: {
    value: number;
    type: string;
  };
  sampleScores?: Array<{
    value: number;
    type: string;
  }>;
}

interface PerspectiveResponse {
  attributeScores: Record<string, PerspectiveAttributeScore>;
  languages: string[];
  detectedLanguages?: string[];
}

interface ModerationResult {
  scores: Record<string, number>;
  maxScore: number;
  maxAttribute: string;
  shouldFlag: boolean;
  shouldMonitor: boolean;
  isAppropriate: boolean;
}

class ContentModerationService {
  private static instance: ContentModerationService;

  public static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  /**
   * Analyze text content using Google Perspective API
   */
  async analyzeText(text: string): Promise<ModerationResult | null> {
    try {
      if (!API_KEY) {
        console.error('Perspective API key not configured');
        return null;
      }

      // Skip analysis for very short messages
      if (text.trim().length < 3) {
        return {
          scores: {},
          maxScore: 0,
          maxAttribute: 'NONE',
          shouldFlag: false,
          shouldMonitor: false,
          isAppropriate: true,
        };
      }

      const requestData: PerspectiveRequest = {
        comment: {
          text: text.trim(),
        },
        requestedAttributes: ANALYZED_ATTRIBUTES.reduce((acc, attr) => {
          acc[attr] = { scoreType: 'PROBABILITY' };
          return acc;
        }, {} as Record<string, { scoreType: string }>),
        languages: ['en'],
        doNotStore: true,
      };

      const response = await fetch(`${PERSPECTIVE_API_ENDPOINT}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perspective API error:', response.status, errorText);
        return null;
      }

      const data: PerspectiveResponse = await response.json();
      
      // Extract scores
      const scores: Record<string, number> = {};
      let maxScore = 0;
      let maxAttribute = 'NONE';

      for (const [attribute, scoreData] of Object.entries(data.attributeScores)) {
        const score = scoreData.summaryScore.value;
        scores[attribute] = score;
        
        if (score > maxScore) {
          maxScore = score;
          maxAttribute = attribute;
        }
      }

      const result: ModerationResult = {
        scores,
        maxScore,
        maxAttribute,
        shouldFlag: maxScore >= TOXICITY_THRESHOLDS.FLAG,
        shouldMonitor: maxScore >= TOXICITY_THRESHOLDS.MONITOR,
        isAppropriate: maxScore < TOXICITY_THRESHOLDS.WARNING,
      };

      return result;

    } catch (error) {
      console.error('Content moderation analysis failed:', error);
      return null;
    }
  }

  /**
   * Process message moderation (async, fire-and-forget)
   */
  async moderateMessage(messageId: string): Promise<void> {
    try {
      // Get the message
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
          chatRoom: {
            include: {
              match: {
                include: {
                  likerBoat: { include: { captain: { include: { profile: true } } } },
                  likedBoat: { include: { captain: { include: { profile: true } } } },
                },
              },
            },
          },
        },
      });

      if (!message) {
        console.error('Message not found for moderation:', messageId);
        return;
      }

      // Analyze the content
      const analysis = await this.analyzeText(message.content);
      
      if (!analysis) {
        console.warn('Content analysis failed for message:', messageId);
        return;
      }

      // Update message with moderation results
      await prisma.message.update({
        where: { id: messageId },
        data: {
          toxicityScore: analysis.maxScore,
          moderationData: {
            scores: analysis.scores,
            maxAttribute: analysis.maxAttribute,
            timestamp: new Date().toISOString(),
            version: '1.0',
          },
          isFlagged: analysis.shouldFlag,
        },
      });

      // If content should be flagged, create automatic report
      if (analysis.shouldFlag) {
        await this.createAutomaticReport(message, analysis);
      }

      // Log significant findings
      if (analysis.shouldMonitor) {
        console.log(`Content moderation alert: Message ${messageId} scored ${analysis.maxScore} for ${analysis.maxAttribute}`);
      }

    } catch (error) {
      console.error('Message moderation processing failed:', error);
    }
  }

  /**
   * Create automatic system report for flagged content
   */
  private async createAutomaticReport(message: any, analysis: ModerationResult): Promise<void> {
    try {
      // Create system user if it doesn't exist
      let systemUser = await prisma.user.findFirst({
        where: { email: 'system@floatr.app' },
      });

      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            clerkId: 'system_floatr',
            email: 'system@floatr.app',
            role: 'CAPTAIN',
            isVerified: true,
            isActive: true,
          },
        });
      }

      // Create automatic report
      const report = await prisma.report.create({
        data: {
          reporterId: systemUser.id,
          reportedUserId: message.senderId,
          reportedMessageId: message.id,
          reportType: 'MESSAGE',
          reason: 'INAPPROPRIATE_BEHAVIOR',
          description: `Automatically flagged by content moderation system. ${analysis.maxAttribute} score: ${analysis.maxScore.toFixed(3)}`,
          evidence: [
            `Toxicity Analysis: ${JSON.stringify(analysis.scores, null, 2)}`,
            `Content: "${message.content}"`,
            `Detected attribute: ${analysis.maxAttribute}`,
          ],
          status: 'PENDING',
        },
      });

      // Send high-priority alert to moderation team
      await this.sendModerationAlert(message, analysis, report.id);

      // Log the automatic report
      await prisma.auditLog.create({
        data: {
          userId: systemUser.id,
          action: 'automatic_report_created',
          resourceType: 'Report',
          resourceId: report.id,
          details: {
            messageId: message.id,
            senderId: message.senderId,
            toxicityScore: analysis.maxScore,
            detectedAttribute: analysis.maxAttribute,
            chatRoomId: message.chatRoomId,
          },
        },
      });

    } catch (error) {
      console.error('Failed to create automatic report:', error);
    }
  }

  /**
   * Send high-priority moderation alert
   */
  private async sendModerationAlert(message: any, analysis: ModerationResult, reportId: string): Promise<void> {
    try {
      const senderName = message.sender.profile 
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName}`
        : message.sender.email;

      const chatContext = message.chatRoom?.match ? {
        likerBoat: message.chatRoom.match.likerBoat.name,
        likedBoat: message.chatRoom.match.likedBoat.name,
        likerCaptain: message.chatRoom.match.likerBoat.captain.profile
          ? `${message.chatRoom.match.likerBoat.captain.profile.firstName} ${message.chatRoom.match.likerBoat.captain.profile.lastName}`
          : message.chatRoom.match.likerBoat.captain.email,
        likedCaptain: message.chatRoom.match.likedBoat.captain.profile
          ? `${message.chatRoom.match.likedBoat.captain.profile.firstName} ${message.chatRoom.match.likedBoat.captain.profile.lastName}`
          : message.chatRoom.match.likedBoat.captain.email,
      } : null;

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
                subject: `🚨 HIGH PRIORITY: Toxic Content Auto-Detected - ${analysis.maxAttribute}`,
              },
            ],
            from: { email: process.env.FROM_EMAIL || 'noreply@floatr.app' },
            content: [
              {
                type: 'text/html',
                value: `
                  <h2 style="color: #dc2626;">🚨 AUTOMATIC CONTENT MODERATION ALERT</h2>
                  <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #991b1b;">Toxic Content Detected</h3>
                    <p><strong>Detection Method:</strong> Automated (Google Perspective API)</p>
                    <p><strong>Primary Issue:</strong> ${analysis.maxAttribute}</p>
                    <p><strong>Toxicity Score:</strong> ${(analysis.maxScore * 100).toFixed(1)}%</p>
                  </div>
                  
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #374151;">Message Details</h3>
                    <p><strong>Sender:</strong> ${senderName} (${message.sender.email})</p>
                    <p><strong>Message ID:</strong> ${message.id}</p>
                    <p><strong>Content:</strong></p>
                    <div style="background: #fff; padding: 12px; border-left: 4px solid #dc2626; margin: 8px 0;">
                      "${message.content}"
                    </div>
                    <p><strong>Sent At:</strong> ${new Date(message.createdAt).toLocaleString()}</p>
                  </div>

                  ${chatContext ? `
                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #1e40af;">Chat Context</h3>
                    <p><strong>Boats:</strong> "${chatContext.likerBoat}" ↔ "${chatContext.likedBoat}"</p>
                    <p><strong>Captains:</strong> ${chatContext.likerCaptain} ↔ ${chatContext.likedCaptain}</p>
                    <p><strong>Chat Room:</strong> ${message.chatRoomId}</p>
                  </div>
                  ` : ''}

                  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #92400e;">Detailed Analysis</h3>
                    ${Object.entries(analysis.scores).map(([attr, score]) => 
                      `<p><strong>${attr}:</strong> ${(score * 100).toFixed(1)}%</p>`
                    ).join('')}
                  </div>

                  <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #166534;">Immediate Actions Taken</h3>
                    <ul>
                      <li>✅ Message flagged in database</li>
                      <li>✅ Automatic report created (ID: ${reportId})</li>
                      <li>✅ Content moderation team notified</li>
                      <li>⏳ Awaiting manual review</li>
                    </ul>
                  </div>

                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3 style="margin: 0; color: #1e40af;">Recommended Actions</h3>
                    <ul>
                      <li>Review message context immediately</li>
                      <li>Consider temporary account restrictions</li>
                      <li>Check user's message history for patterns</li>
                      <li>Update report status after review</li>
                      <li>Consider warning or suspension if appropriate</li>
                    </ul>
                  </div>

                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <p><em>Auto-Report ID: ${reportId}</em></p>
                `,
              },
            ],
          }),
        });
      }

      // Slack notification  
      if (process.env.EMERGENCY_SLACK_WEBHOOK) {
        const slackPayload = {
          text: `🚨 URGENT: Toxic Content Auto-Detected`,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Issue', value: analysis.maxAttribute, short: true },
                { title: 'Score', value: `${(analysis.maxScore * 100).toFixed(1)}%`, short: true },
                { title: 'Sender', value: `${senderName} (${message.sender.email})`, short: true },
                { title: 'Message ID', value: message.id, short: true },
                { title: 'Content', value: `"${message.content}"`, short: false },
                { title: 'Auto-Report ID', value: reportId, short: true },
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

    } catch (error) {
      console.error('Failed to send moderation alert:', error);
    }
  }
}

// Export singleton instance
export const contentModerationService = ContentModerationService.getInstance();

// Export types for use in other modules
export type { ModerationResult }; 