import { AppConfig } from '@/types';

// Environment configuration with type safety
export const config: AppConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  VERIFF_API_KEY: process.env.VERIFF_API_KEY,
  VERIFF_SECRET_KEY: process.env.VERIFF_SECRET_KEY,
  VERIFF_BASE_URL: process.env.VERIFF_BASE_URL || 'https://stationapi.veriff.com',
  VERIFF_WEBHOOK_URL: process.env.VERIFF_WEBHOOK_URL,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  PUSHER_KEY: process.env.PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  SMS_API_KEY: process.env.TWILIO_AUTH_TOKEN,
};

// App Constants
export const APP_CONFIG = {
  // App Information
  APP_NAME: 'Floatr',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Revolutionary social connectivity platform for recreational boating community',
  
  // URLs
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  API_BASE_URL: process.env.API_BASE_URL || '/api',
  
  // Authentication
  AUTH: {
    SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
    PASSWORD_MIN_LENGTH: 8,
    VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  },
  
  // User Profile
  PROFILE: {
    MIN_AGE: 18,
    MAX_AGE: 100,
    MAX_BIO_LENGTH: 500,
    MAX_INTERESTS: 10,
    MAX_EMERGENCY_CONTACTS: 3,
    SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  },
  
  // Boat Configuration
  BOAT: {
    MIN_LENGTH: 5, // meters
    MAX_LENGTH: 200, // meters
    MIN_CAPACITY: 1,
    MAX_CAPACITY: 50,
    MAX_IMAGES: 10,
    MAX_AMENITIES: 20,
    MAX_DESCRIPTION_LENGTH: 1000,
    VIBES: ['party', 'chill', 'private', 'family', 'adventure'] as const,
    TYPES: ['sailboat', 'motorboat', 'yacht', 'catamaran', 'speedboat', 'other'] as const,
  },
  
  // Location & Discovery
  LOCATION: {
    DEFAULT_DISCOVERY_RADIUS: 25, // kilometers
    MIN_DISCOVERY_RADIUS: 5,
    MAX_DISCOVERY_RADIUS: 100,
    LOCATION_UPDATE_INTERVAL: 30000, // 30 seconds
    LOCATION_ACCURACY_THRESHOLD: 100, // meters
    GEOFENCE_BUFFER: 1000, // meters
  },
  
  // Matching System
  MATCHING: {
    MAX_DAILY_SWIPES: 100,
    MATCH_EXPIRY_DAYS: 30,
    COOLDOWN_AFTER_PASS: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Chat & Communication
  CHAT: {
    MAX_MESSAGE_LENGTH: 1000,
    MESSAGE_BATCH_SIZE: 50,
    TYPING_TIMEOUT: 3000, // 3 seconds
    MESSAGE_RETENTION_DAYS: 90,
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  },
  
  // Safety & Security
  SAFETY: {
    SOS_ALERT_RADIUS: 50, // kilometers
    MAX_REPORTS_PER_USER_PER_DAY: 5,
    REPORT_COOLDOWN: 60 * 60 * 1000, // 1 hour
    AUTO_BLOCK_AFTER_REPORTS: 5,
    CONTENT_MODERATION_CONFIDENCE_THRESHOLD: 0.8,
  },
  
  // Rate Limiting
  RATE_LIMITS: {
    API_REQUESTS_PER_MINUTE: 60,
    REGISTRATION_ATTEMPTS_PER_HOUR: 3,
    PASSWORD_RESET_ATTEMPTS_PER_HOUR: 3,
    MESSAGE_SEND_PER_MINUTE: 30,
    SWIPE_ACTIONS_PER_MINUTE: 60,
  },
  
  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
    THUMBNAIL_SIZE: { width: 300, height: 300 },
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE: 1,
  },
  
  // External Services
  EXTERNAL_SERVICES: {
    VERIFF: {
      BASE_URL: process.env.VERIFF_BASE_URL || 'https://stationapi.veriff.com',
      TIMEOUT: 30000, // 30 seconds
    },
    ONFIDO: {
      BASE_URL: process.env.ONFIDO_BASE_URL || 'https://api.onfido.com',
      TIMEOUT: 30000, // 30 seconds
    },
    GOOGLE_MAPS: {
      DEFAULT_ZOOM: 12,
      MAX_ZOOM: 18,
      MIN_ZOOM: 8,
    },
    PUSHER: {
      CLUSTER: process.env.PUSHER_CLUSTER || 'us2',
      ENCRYPTED: true,
    },
  },
  
  // Feature Flags
  FEATURES: {
    IDENTITY_VERIFICATION: process.env.ENABLE_IDENTITY_VERIFICATION === 'true',
    REAL_TIME_CHAT: process.env.ENABLE_REAL_TIME_CHAT === 'true',
    SOS_ALERTS: process.env.ENABLE_SOS_ALERTS === 'true',
    LOCATION_TRACKING: process.env.ENABLE_LOCATION_TRACKING === 'true',
    OAUTH_LOGIN: true,
    EMAIL_VERIFICATION: !process.env.SKIP_EMAIL_VERIFICATION,
    CONTENT_MODERATION: true,
    ANALYTICS: true,
  },
  
  // Development Settings
  DEV: {
    MOCK_VERIFICATION: process.env.MOCK_VERIFICATION_API === 'true',
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
    BYPASS_RATE_LIMITS: process.env.NODE_ENV === 'development',
    SHOW_API_ERRORS: process.env.NODE_ENV === 'development',
  },
} as const;

// Validation functions
export const validateConfig = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate URLs
  try {
    new URL(APP_CONFIG.APP_URL);
  } catch {
    throw new Error('Invalid APP_URL format');
  }
  
  return true;
};

// Helper functions for configuration
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isFeatureEnabled = (feature: keyof typeof APP_CONFIG.FEATURES) => 
  APP_CONFIG.FEATURES[feature];

// Export commonly used constants
export const {
  AUTH,
  PROFILE,
  BOAT,
  LOCATION,
  MATCHING,
  CHAT,
  SAFETY,
  RATE_LIMITS,
  UPLOAD,
  PAGINATION,
  EXTERNAL_SERVICES,
  FEATURES,
  DEV,
} = APP_CONFIG; 