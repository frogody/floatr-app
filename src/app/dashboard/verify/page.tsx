import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VerificationFlow from './components/VerificationFlow';

// Check if we have valid Clerk keys
const hasValidClerkKeys = () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey && publishableKey.startsWith('pk_') && !publishableKey.includes('placeholder');
};

export default async function VerifyPage() {
  // If no valid Clerk keys, show setup instructions
  if (!hasValidClerkKeys()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Clerk Setup Required</CardTitle>
            <CardDescription>
              To use identity verification, please configure your Clerk API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Add your NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY 
              to your environment variables to enable authentication and verification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authentication server-side
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-lg font-bold text-white">F</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Identity Verification</h1>
                <p className="text-sm text-gray-500">Secure your Floatr account</p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Verification Required
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🔒</span>
                <span>Verify Your Identity</span>
              </CardTitle>
              <CardDescription>
                To ensure the safety and trust of our boating community, we require identity verification for all Floatr users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Welcome, {user?.firstName}!</p>
                  <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Why do we verify identities?</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensures a trusted community of real boaters</li>
                    <li>• Prevents fraud and fake profiles</li>
                    <li>• Enables safe social connections on the water</li>
                    <li>• Complies with maritime safety regulations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Verification Flow */}
          <VerificationFlow />

          {/* Security Notice */}
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <span className="text-lg">🔐</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Your Privacy & Security</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Your personal information is encrypted and processed securely by Veriff, 
                    a trusted identity verification partner. We only store your verification 
                    status and never retain your identity documents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 