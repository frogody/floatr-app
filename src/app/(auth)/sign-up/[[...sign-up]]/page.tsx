import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Join the Floatr Community
        </h2>
        <p className="text-gray-600 mt-2">
          Create your account and start connecting with fellow boaters
        </p>
      </div>
      
      <SignUp 
        appearance={{
          variables: {
            colorPrimary: '#2563eb', // Blue-600
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorTextSecondary: '#6b7280',
            colorInputBackground: '#f9fafb',
            colorInputText: '#111827',
            borderRadius: '0.5rem',
            fontFamily: 'var(--font-geist-sans)',
          },
          elements: {
            formButtonPrimary: {
              backgroundColor: '#2563eb',
              '&:hover': {
                backgroundColor: '#1d4ed8',
              },
            },
            card: {
              boxShadow: 'none',
              backgroundColor: 'transparent',
            },
            headerTitle: {
              display: 'none',
            },
            headerSubtitle: {
              display: 'none',
            },
          },
        }}
        redirectUrl="/dashboard"
        signInUrl="/sign-in"
      />
      
      <div className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link 
          href="/sign-in" 
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
} 