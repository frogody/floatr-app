import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/boats(.*)',
  '/messages(.*)',
  '/settings(.*)',
]);

// Define routes that require verification (subset of protected routes)
const isVerificationRequiredRoute = createRouteMatcher([
  '/dashboard',
  '/profile(.*)',
  '/boats(.*)',
  '/messages(.*)',
  '/settings(.*)',
]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about',
  '/privacy',
  '/terms',
  '/api/webhooks(.*)', // Allow webhooks to be accessed publicly
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Protect dashboard and other authenticated routes
  if (isProtectedRoute(req)) {
    await auth.protect();
    
    // Check if this route requires verification
    if (isVerificationRequiredRoute(req) && pathname !== '/dashboard/verify') {
      // For MVP, we'll skip verification checks since we don't have database integration yet
      // In production, this would check the user's verification status from the database
      
      // TODO: Check user verification status from database
      // const { userId } = auth();
      // const user = await getUserVerificationStatus(userId);
      // if (!user.isVerified) {
      //   return NextResponse.redirect(new URL('/dashboard/verify', req.url));
      // }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 