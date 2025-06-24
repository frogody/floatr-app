/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow builds to continue even with missing environment variables during development
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_placeholder',
  },
  // Skip pre-rendering errors during build for development
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      skipTrailingSlashRedirect: true,
    },
  }),
};

export default nextConfig; 