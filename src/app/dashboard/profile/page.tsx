import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileForm } from './components/ProfileForm';
import { EmergencyContactsForm } from './components/EmergencyContactsForm';

export default async function ProfilePage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  // Fetch user profile data
  let userProfile = null;
  let hasProfile = false;

  try {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/profile`, {
      headers: {
        'Cookie': '', // Add request headers if needed
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      userProfile = data.data.user;
      hasProfile = data.data.hasProfile;
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile?.isVerified ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600">
                Verification Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Overview Card */}
        {hasProfile && userProfile?.profile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile.profile.profileImage} />
                  <AvatarFallback className="text-lg">
                    {userProfile.profile.firstName?.[0]}{userProfile.profile.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {userProfile.profile.firstName} {userProfile.profile.lastName}
                  </h3>
                  <p className="text-muted-foreground">{userProfile.email}</p>
                  {userProfile.profile.bio && (
                    <p className="mt-2 text-sm">{userProfile.profile.bio}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={userProfile.role === 'CAPTAIN' ? 'default' : 'secondary'}>
                      {userProfile.role}
                    </Badge>
                    {userProfile.profile.interests?.map((interest: string) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {hasProfile ? 'Edit Profile' : 'Complete Your Profile'}
            </CardTitle>
            <CardDescription>
              {hasProfile 
                ? 'Update your personal information below'
                : 'Please complete your profile to start using Floatr'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm 
              initialData={userProfile?.profile} 
              userRole={userProfile?.role}
              hasProfile={hasProfile}
            />
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        {hasProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>
                Add emergency contacts for safety purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyContactsForm 
                contacts={userProfile?.profile?.emergencyContacts || []}
                profileId={userProfile?.profile?.id}
              />
            </CardContent>
          </Card>
        )}

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account settings and verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {!userProfile?.isVerified && (
                <Button asChild variant="default">
                  <a href="/dashboard/verify">
                    Complete Identity Verification
                  </a>
                </Button>
              )}
              
              {userProfile?.role === 'CAPTAIN' && (
                <Button asChild variant="outline">
                  <a href="/dashboard/boat">
                    Manage My Boats
                  </a>
                </Button>
              )}
              
              <Button variant="outline">
                Privacy Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 