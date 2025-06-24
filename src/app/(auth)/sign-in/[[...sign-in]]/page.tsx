import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome Back
        </h2>
        <p className="text-gray-600 mt-2">
          Sign in to your Floatr account and get back on the water
        </p>
      </div>
      
      <SignIn 
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
        signUpUrl="/sign-up"
      />
      
      <div className="text-center text-sm text-gray-500 mt-6">
        New to Floatr?{' '}
        <Link 
          href="/sign-up" 
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
} 