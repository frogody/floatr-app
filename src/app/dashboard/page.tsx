import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Check if we have valid Clerk keys
const hasValidClerkKeys = () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey && publishableKey.startsWith('pk_') && !publishableKey.includes('placeholder');
};

export default async function DashboardPage() {
  // If no valid Clerk keys, show setup instructions
  if (!hasValidClerkKeys()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Clerk Setup Required</CardTitle>
            <CardDescription>
              To use authentication features, please configure your Clerk API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Add your NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY 
              to your environment variables to enable authentication.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-lg font-bold text-white">F</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Floatr</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Authenticated
              </Badge>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
                showName={true}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Welcome to Floatr Dashboard</span>
                <Badge className="bg-blue-100 text-blue-800">MVP</Badge>
              </CardTitle>
              <CardDescription>
                Your social boating platform is ready to set sail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Logged in as:</p>
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-blue-900">Profile Setup</h3>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 mt-1 mb-3">Complete your boating profile</p>
                    <Link href="/dashboard/profile">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Manage Profile
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-orange-900">Identity Verification</h3>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                        Required
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-700 mt-1 mb-3">
                      Verify your identity for community safety
                    </p>
                    <Link href="/dashboard/verify">
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        Start Verification
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-green-900">⚓ Boat Management</h3>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-green-700 mt-1 mb-3">Create and manage your boat profiles</p>
                    <Link href="/dashboard/boat">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        My Boats
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-pink-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-pink-900">🧭 Discover</h3>
                      <Badge variant="outline" className="bg-pink-100 text-pink-700 border-pink-200">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-pink-700 mt-1 mb-3">Swipe and match with nearby boats</p>
                    <Link href="/dashboard/discover">
                      <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                        Start Swiping
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-indigo-900">💬 Messages</h3>
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                        New!
                      </Badge>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1 mb-3">Chat with your matched boats</p>
                    <Link href="/dashboard/messages">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        Open Chats
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-purple-900">🗺️ Live Map</h3>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-purple-700 mt-1 mb-3">Real-time location of nearby boats</p>
                    <Link href="/dashboard/map">
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Open Map
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Development Status */}
          <Card>
            <CardHeader>
              <CardTitle>Development Progress</CardTitle>
              <CardDescription>
                Task completion status for Floatr MVP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ Project Setup & Infrastructure</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ User Authentication System</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ Identity Verification System</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ User Profile Management</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ Real-Time Location & Mapping</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ Social Discovery & Matching</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">🚧 Real-Time Communication</span>
                  <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">⏳ Safety & Security Features</span>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 