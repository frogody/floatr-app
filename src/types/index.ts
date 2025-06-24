// Core User Types
export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  profile: UserProfile;
  verificationStatus: VerificationStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  profileImage?: string;
  bio?: string;
  interests: string[];
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Verification Types
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface VerificationData {
  id: string;
  userId: string;
  documentType: string;
  documentImages: string[];
  selfieVideo?: string;
  verificationResult?: VerificationResult;
  status: VerificationStatus;
  submittedAt: Date;
  processedAt?: Date;
}

export interface VerificationResult {
  overall: 'approved' | 'declined';
  confidence: number;
  checks: {
    documentAuthenticity: boolean;
    faceMatch: boolean;
    livenessCheck: boolean;
  };
}

// User Role Types
export type UserRole = 'captain' | 'crew';

// Boat Types
export interface Boat {
  id: string;
  captainId: string;
  name: string;
  type: BoatType;
  length: number;
  capacity: number;
  images: string[];
  currentVibe: BoatVibe;
  description?: string;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type BoatType = 'sailboat' | 'motorboat' | 'yacht' | 'catamaran' | 'speedboat' | 'other';
export type BoatVibe = 'party' | 'chill' | 'private' | 'family' | 'adventure';

// Location & Mapping Types
export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

export interface BoatLocation {
  id: string;
  boatId: string;
  location: Location;
  isVisible: boolean;
  heading?: number;
  speed?: number;
}

// Matching & Discovery Types
export interface DiscoverySettings {
  userId: string;
  maxDistance: number; // in kilometers
  preferredVibes: BoatVibe[];
  ageRange: [number, number];
  boatTypes: BoatType[];
  isDiscoverable: boolean;
}

export interface SwipeAction {
  id: string;
  fromBoatId: string;
  toBoatId: string;
  action: 'like' | 'pass';
  timestamp: Date;
}

export interface Match {
  id: string;
  boat1Id: string;
  boat2Id: string;
  matchedAt: Date;
  isActive: boolean;
  lastInteraction?: Date;
}

// Chat & Communication Types
export interface ChatRoom {
  id: string;
  matchId: string;
  participants: string[]; // boat IDs
  createdAt: Date;
  lastMessage?: Message;
  isActive: boolean;
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string; // boat ID
  content: string;
  type: MessageType;
  timestamp: Date;
  readBy: string[]; // boat IDs
  isDeleted: boolean;
}

export type MessageType = 'text' | 'emoji' | 'image' | 'location' | 'system';

// Safety & Security Types
export interface SOSAlert {
  id: string;
  userId: string;
  location: Location;
  message?: string;
  status: SOSStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export type SOSStatus = 'active' | 'resolved' | 'false_alarm';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedBoatId?: string;
  reason: ReportReason;
  description: string;
  evidence?: string[];
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export type ReportReason = 'inappropriate_behavior' | 'harassment' | 'fake_profile' | 'safety_concern' | 'spam' | 'other';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  agreeToTerms: boolean;
}

export interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface BoatProfileForm {
  name: string;
  type: BoatType;
  length: number;
  capacity: number;
  description: string;
  amenities: string[];
  currentVibe: BoatVibe;
}

// Event Types for Real-time Updates
export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type WebSocketEventType = 
  | 'location_update'
  | 'new_message'
  | 'match_found'
  | 'sos_alert'
  | 'user_online'
  | 'user_offline';

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Environment Types
export interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  VERIFF_API_KEY?: string;
  VERIFF_SECRET_KEY?: string;
  VERIFF_BASE_URL?: string;
  VERIFF_WEBHOOK_URL?: string;
  GOOGLE_MAPS_API_KEY?: string;
  PUSHER_APP_ID?: string;
  PUSHER_KEY?: string;
  PUSHER_SECRET?: string;
  SMS_API_KEY?: string;
} 