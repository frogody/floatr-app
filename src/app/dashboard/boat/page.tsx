import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateBoatForm } from './components/CreateBoatForm';
import { BoatCard } from './components/BoatCard';

export default async function BoatPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  // Fetch user boats data
  let userBoats = [];
  let isCaptain = false;
  let userProfile = null;

  try {
    // First get user profile to check role
    const profileResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/profile`, {
      headers: {
        'Cookie': '', // Add request headers if needed
      },
      cache: 'no-store',
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      userProfile = profileData.data.user;
      isCaptain = profileData.data.user?.role === 'CAPTAIN';
    }

    // Fetch boats if user is captain
    if (isCaptain) {
      const boatsResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/boats`, {
        headers: {
          'Cookie': '', // Add request headers if needed
        },
        cache: 'no-store',
      });

      if (boatsResponse.ok) {
        const boatsData = await boatsResponse.json();
        userBoats = boatsData.data.boats || [];
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }

  // Redirect if user is not a captain
  if (!isCaptain) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Boat Management</CardTitle>
            <CardDescription>
              Access restricted to boat captains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Captain Access Required</h3>
              <p className="text-muted-foreground mb-4">
                Only users with Captain role can manage boat profiles.
              </p>
              <Button asChild>
                <a href="/dashboard/profile">
                  Update Profile to Captain
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is verified
  if (!userProfile?.isVerified) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Identity Verification Required</CardTitle>
            <CardDescription>
              Complete verification to manage boat profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Verification Needed</h3>
              <p className="text-muted-foreground mb-4">
                For safety and trust, you must complete identity verification before creating boat profiles.
              </p>
              <Button asChild>
                <a href="/dashboard/verify">
                  Complete Verification
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Boats</h1>
            <p className="text-muted-foreground mt-2">
              Manage your boat profiles and crew
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              ⚓ Captain
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ✓ Verified
            </Badge>
          </div>
        </div>

        {/* Existing Boats */}
        {userBoats.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Boats ({userBoats.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userBoats.map((boat: any) => (
                <BoatCard key={boat.id} boat={boat} />
              ))}
            </div>
          </div>
        )}

        {/* Create New Boat */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userBoats.length === 0 ? 'Add Your First Boat' : 'Add Another Boat'}
            </CardTitle>
            <CardDescription>
              {userBoats.length === 0 
                ? 'Create your boat profile to start connecting with crew members'
                : 'Expand your fleet by adding another boat'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBoatForm />
          </CardContent>
        </Card>

        {/* Empty State */}
        {userBoats.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⛵</div>
                <h3 className="text-lg font-semibold mb-2">No Boats Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first boat profile to start building your crew and connecting with other boaters.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Add boat details and photos</p>
                  <p>✓ Set your boat's vibe and capacity</p>
                  <p>✓ Start matching with crew members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Captain Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Captain Tips</CardTitle>
            <CardDescription>
              Best practices for managing your boat profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">📸 Great Photos</h4>
                <p className="text-sm text-muted-foreground">
                  Add high-quality photos of your boat's exterior, interior, and key amenities
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎯 Set the Right Vibe</h4>
                <p className="text-sm text-muted-foreground">
                  Choose a vibe that matches the experience you want to create
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">📝 Detailed Description</h4>
                <p className="text-sm text-muted-foreground">
                  Write a compelling description of your boat and typical outings
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🧑‍🤝‍🧑 Manage Crew</h4>
                <p className="text-sm text-muted-foreground">
                  Keep your crew list updated and communicate expectations clearly
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 