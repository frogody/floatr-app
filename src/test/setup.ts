import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/floatr_test';
process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'pk.test.mapbox-token';

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn().mockResolvedValue('test-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-in-button">{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-up-button">{children}</div>,
  UserButton: () => <div data-testid="user-button">User Menu</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    forEach: vi.fn(),
    append: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    sort: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => '/test-path',
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
  Map: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 10),
    getBounds: vi.fn(),
    project: vi.fn(),
    unproject: vi.fn(),
  })),
  Marker: vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    getElement: vi.fn(),
  })),
  Popup: vi.fn(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    setHTML: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  })),
  supported: vi.fn(() => true),
}));

// Mock react-map-gl
vi.mock('react-map-gl/mapbox', () => ({
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="mapbox-map">{children}</div>,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="mapbox-marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="mapbox-popup">{children}</div>,
  GeolocateControl: () => <div data-testid="geolocate-control" />,
  NavigationControl: () => <div data-testid="navigation-control" />,
  ScaleControl: () => <div data-testid="scale-control" />,
  Source: ({ children }: { children: React.ReactNode }) => <div data-testid="mapbox-source">{children}</div>,
  Layer: () => <div data-testid="mapbox-layer" />,
}));

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'test-socket-id',
  })),
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}; 