import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestUser, createTestBoat, resetTestDb, getTestDb } from '../utils/database';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Twilio
vi.mock('twilio', () => {
  const mockMessages = {
    create: vi.fn().mockResolvedValue({
      sid: 'test-message-sid',
      status: 'sent',
    }),
  };
  
  return {
    default: vi.fn(() => ({
      messages: mockMessages,
    })),
  };
});

// Mock fetch for external APIs
global.fetch = vi.fn();

// Import the auth mock
import { auth } from '@clerk/nextjs/server';
const mockAuth = auth as ReturnType<typeof vi.fn>;

describe('/api/sos API Integration Tests', () => {
  let testUser: any;
  let testBoat: any;
  let testDb: any;

  beforeEach(async () => {
    await resetTestDb();
    testDb = getTestDb();
    
    // Create test user and boat
    testUser = await createTestUser({
      clerkId: 'test-clerk-id',
      email: 'test@example.com',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+1234567890',
      emergencyContactRelation: 'Friend',
    });
    
    testBoat = await createTestBoat(testUser.id, {
      name: 'Test Boat',
      type: 'SAILBOAT',
    });

    // Mock successful authentication
    mockAuth.mockResolvedValue({ userId: 'test-clerk-id' });

    // Mock environment variables
    process.env.TWILIO_PHONE_NUMBER = '+15005550006';
    process.env.EMERGENCY_NOTIFICATION_EMAIL = 'emergency@floatr.app';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.FROM_EMAIL = 'noreply@floatr.app';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.EMERGENCY_NOTIFICATION_EMAIL;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  describe('POST /api/sos', () => {
    it('creates SOS alert successfully with coordinates', async () => {
      // Mock external API calls
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Engine failure, need immediate assistance',
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      // Verify SOS alert was created in database
      const sosAlert = await testDb.sOSAlert.findFirst({
        where: { userId: testUser.id },
      });

      expect(sosAlert).toBeTruthy();
      expect(sosAlert.message).toBe('Engine failure, need immediate assistance');
      expect(sosAlert.latitude).toBe(52.3676);
      expect(sosAlert.longitude).toBe(4.9041);
      expect(sosAlert.status).toBe('ACTIVE');
    });

    it('creates SOS alert without custom message', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      const sosAlert = await testDb.sOSAlert.findFirst({
        where: { userId: testUser.id },
      });

      expect(sosAlert).toBeTruthy();
      expect(sosAlert.message).toBe('Emergency assistance requested');
    });

    it('fails when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('fails when user has no active boats', async () => {
      // Delete the test boat
      await testDb.boat.delete({ where: { id: testBoat.id } });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('No active boat found');
    });

    it('fails when no location data available', async () => {
      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Help needed',
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('No location data available');
    });

    it('creates audit log entry', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      const auditLog = await testDb.auditLog.findFirst({
        where: {
          userId: testUser.id,
          action: 'sos_alert_created',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.resourceType).toBe('SOSAlert');
      expect(auditLog.details).toHaveProperty('boatId');
      expect(auditLog.details).toHaveProperty('location');
    });

    it('handles Twilio SMS sending', async () => {
      const twilioMock = await import('twilio');
      const mockCreate = vi.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      (twilioMock.default as any).mockReturnValue({
        messages: { create: mockCreate },
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Emergency',
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+15005550006',
          to: '+1234567890',
          body: expect.stringContaining('SOS EMERGENCY ALERT'),
        })
      );
    });

    it('sends email notifications to emergency team', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      // Verify SendGrid API was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-sendgrid-key',
          }),
        })
      );
    });

    it('includes boat location when coordinates not provided', async () => {
      // Create a location for the test boat
      await testDb.boatLocation.create({
        data: {
          boatId: testBoat.id,
          latitude: 51.5074,
          longitude: -0.1278,
          isVisible: true,
        },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Emergency',
        }),
      });

      const sosAlert = await testDb.sOSAlert.findFirst({
        where: { userId: testUser.id },
      });

      expect(sosAlert).toBeTruthy();
      expect(sosAlert.latitude).toBe(51.5074);
      expect(sosAlert.longitude).toBe(-0.1278);
    });

    it('handles errors gracefully and logs them', async () => {
      // Mock Twilio to throw an error
      const twilioMock = await import('twilio');
      (twilioMock.default as any).mockImplementation(() => {
        throw new Error('Twilio connection failed');
      });

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: {
            latitude: 52.3676,
            longitude: 4.9041,
          },
        }),
      });

      expect(response.status).toBe(500);
      
      // Should still create audit log for failed attempt
      const auditLog = await testDb.auditLog.findFirst({
        where: {
          userId: testUser.id,
          action: 'sos_alert_failed',
        },
      });

      expect(auditLog).toBeTruthy();
    });

    it('validates request body structure', async () => {
      const invalidRequests = [
        {}, // Empty body
        { coordinates: {} }, // Empty coordinates
        { coordinates: { latitude: 'invalid' } }, // Invalid latitude type
        { coordinates: { latitude: 91 } }, // Latitude out of range
        { coordinates: { longitude: 181 } }, // Longitude out of range
      ];

      for (const invalidBody of invalidRequests) {
        const response = await fetch('/api/sos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidBody),
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('GET /api/sos', () => {
    beforeEach(async () => {
      // Create some test SOS alerts
      await testDb.sOSAlert.createMany({
        data: [
          {
            userId: testUser.id,
            latitude: 52.3676,
            longitude: 4.9041,
            message: 'Active alert',
            status: 'ACTIVE',
          },
          {
            userId: testUser.id,
            latitude: 51.5074,
            longitude: -0.1278,
            message: 'Resolved alert',
            status: 'RESOLVED',
          },
        ],
      });
    });

    it('returns active SOS alerts for authenticated user', async () => {
      const response = await fetch('/api/sos', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.activeAlerts).toHaveLength(1);
      expect(data.data.activeAlerts[0].message).toBe('Active alert');
      expect(data.data.hasActiveAlerts).toBe(true);
    });

    it('returns empty array when no active alerts', async () => {
      // Update all alerts to resolved
      await testDb.sOSAlert.updateMany({
        where: { userId: testUser.id },
        data: { status: 'RESOLVED' },
      });

      const response = await fetch('/api/sos', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data.activeAlerts).toHaveLength(0);
      expect(data.data.hasActiveAlerts).toBe(false);
    });

    it('fails when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const response = await fetch('/api/sos', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('orders alerts by creation date (newest first)', async () => {
      // Create another active alert
      await testDb.sOSAlert.create({
        data: {
          userId: testUser.id,
          latitude: 48.8566,
          longitude: 2.3522,
          message: 'Newer alert',
          status: 'ACTIVE',
        },
      });

      const response = await fetch('/api/sos', {
        method: 'GET',
      });

      const data = await response.json();
      expect(data.data.activeAlerts).toHaveLength(2);
      expect(data.data.activeAlerts[0].message).toBe('Newer alert');
    });
  });
}); 