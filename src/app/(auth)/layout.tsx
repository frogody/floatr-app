import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Floatr Logo and Branding */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
              Floatr
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Connect with the boating community
            </p>
          </div>

          {/* Auth Form Container */}
          <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            <p>&copy; 2025 Floatr. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-blue-600 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 