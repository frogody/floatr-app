import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SwipeInterface } from './components/SwipeInterface';

export default async function DiscoverPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">🧭 Discover</h1>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">Find boats and crews near you</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SwipeInterface />
      </div>
    </div>
  );
} 