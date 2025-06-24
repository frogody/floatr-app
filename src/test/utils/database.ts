import { PrismaClient } from '@prisma/client';

// Create test database instance
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/floatr_test',
    },
  },
});

/**
 * Setup test database with clean state
 */
export async function setupTestDb() {
  try {
    // Clean all tables in correct order (respecting foreign key constraints)
    await testDb.auditLog.deleteMany({});
    await testDb.message.deleteMany({});
    await testDb.swipeAction.deleteMany({});
    await testDb.match.deleteMany({});
    await testDb.report.deleteMany({});
    await testDb.blockedUser.deleteMany({});
    await testDb.noGoZone.deleteMany({});
    await testDb.location.deleteMany({});
    await testDb.boat.deleteMany({});
    await testDb.userSession.deleteMany({});
    await testDb.user.deleteMany({});
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  }
}

/**
 * Tear down test database
 */
export async function teardownTestDb() {
  try {
    await testDb.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Error tearing down test database:', error);
    throw error;
  }
}

/**
 * Create test user with all required fields
 */
export async function createTestUser(overrides: Partial<any> = {}) {
  const userData = {
    clerkId: 'test-clerk-id-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: new Date('1990-01-01'),
    phoneNumber: '+1234567890',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+1987654321',
    emergencyContactRelation: 'Friend',
    isVerified: true,
    verificationStatus: 'APPROVED' as const,
    verificationSessionId: 'test-session-id',
    privacySettings: {
      locationVisible: true,
      profileVisible: true,
      showOnlineStatus: true,
    },
    ...overrides,
  };

  return await testDb.user.create({
    data: userData,
  });
}

/**
 * Create test boat with captain
 */
export async function createTestBoat(captainId: string, overrides: Partial<any> = {}) {
  const boatData = {
    name: 'Test Boat',
    type: 'MOTORBOAT' as const,
    length: 25,
    capacity: 6,
    currentVibe: 'CHILL' as const,
    description: 'A test boat for testing purposes',
    amenities: ['GPS', 'Radio'],
    images: ['https://example.com/boat.jpg'],
    captainId,
    ...overrides,
  };

  return await testDb.boat.create({
    data: boatData,
  });
}

/**
 * Create test location for user
 */
export async function createTestLocation(userId: string, overrides: Partial<any> = {}) {
  const locationData = {
    userId,
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    isVisible: true,
    ...overrides,
  };

  return await testDb.location.create({
    data: locationData,
  });
}

/**
 * Create test match between two boats
 */
export async function createTestMatch(
  boat1Id: string,
  boat2Id: string,
  overrides: Partial<any> = {}
) {
  const matchData = {
    boat1Id,
    boat2Id,
    status: 'ACTIVE' as const,
    ...overrides,
  };

  return await testDb.match.create({
    data: matchData,
  });
}

/**
 * Create test message in a match
 */
export async function createTestMessage(
  matchId: string,
  senderId: string,
  overrides: Partial<any> = {}
) {
  const messageData = {
    matchId,
    senderId,
    content: 'Test message',
    messageType: 'TEXT' as const,
    ...overrides,
  };

  return await testDb.message.create({
    data: messageData,
  });
}

/**
 * Create test no-go zone
 */
export async function createTestNoGoZone(overrides: Partial<any> = {}) {
  const zoneData = {
    name: 'Test Protected Area',
    zoneType: 'ECOLOGICAL' as const,
    description: 'Test zone for testing purposes',
    severity: 'warning',
    regulations: ['No anchoring', 'Speed limit: 5 knots'],
    // Simple polygon geometry (requires PostGIS)
    // geometry: 'POLYGON((-122.4 37.8, -122.38 37.8, -122.38 37.82, -122.4 37.82, -122.4 37.8))',
    ...overrides,
  };

  return await testDb.noGoZone.create({
    data: zoneData,
  });
}

/**
 * Get test database instance
 */
export function getTestDb() {
  return testDb;
}

/**
 * Reset database to clean state (for use between tests)
 */
export async function resetTestDb() {
  await setupTestDb();
}

export default testDb; 