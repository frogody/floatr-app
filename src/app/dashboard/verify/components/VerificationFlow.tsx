'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface VerificationSessionData {
  sessionId: string;
  sessionUrl: string;
  sessionToken: string;
  host: string;
  status: string;
}

interface VerificationConfig {
  configured: boolean;
  userId: string;
  canStartVerification: boolean;
}

export default function VerificationFlow() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<VerificationSessionData | null>(null);
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [verificationStarted, setVerificationStarted] = useState(false);

  // Check verification configuration on component mount
  useEffect(() => {
    fetchVerificationConfig();
  }, []);

  const fetchVerificationConfig = async () => {
    try {
      const response = await fetch('/api/verification');
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.message || 'Failed to check verification configuration');
      }
    } catch (error) {
      console.error('Error fetching verification config:', error);
      setError('Unable to connect to verification service');
    }
  };

  const startVerification = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSessionData(result.data);
        setVerificationStarted(true);
        
        // Initialize Veriff SDK
        initializeVeriffSDK(result.data);
      } else {
        setError(result.message || 'Failed to start verification');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      setError('Unable to start verification. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeVeriffSDK = (sessionData: VerificationSessionData) => {
    // Open Veriff in new window
    if (typeof window !== 'undefined') {
      window.open(sessionData.sessionUrl, '_blank', 'width=800,height=600');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Check */}
      {config && !config.configured && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-700">
            Identity verification service is not currently configured. Please contact support for assistance.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Process Card */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Process</CardTitle>
          <CardDescription>
            The verification process takes just a few minutes and is powered by Veriff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">📄</span>
                </div>
                <h3 className="font-medium text-gray-900">1. Document</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload a government-issued ID (passport, driver&apos;s license, or ID card)
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">🤳</span>
                </div>
                <h3 className="font-medium text-gray-900">2. Selfie</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Take a quick selfie to verify your identity matches your document
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">✅</span>
                </div>
                <h3 className="font-medium text-gray-900">3. Verified</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get verified and access the full Floatr experience
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {config?.configured ? (
                <>
                  <Button 
                    onClick={startVerification}
                    disabled={isLoading || verificationStarted}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting Verification...
                      </>
                    ) : verificationStarted ? (
                      'Verification In Progress...'
                    ) : (
                      'Start Identity Verification'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                    className="flex-1"
                    size="lg"
                  >
                    Back to Dashboard
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                  size="lg"
                >
                  Back to Dashboard
                </Button>
              )}
            </div>

            {sessionData && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Verification Started</h4>
                <p className="text-sm text-green-700">
                  A new window has opened with the Veriff verification process. 
                  Please complete the verification there and return to this page.
                </p>
                <div className="mt-3">
                  <p className="text-xs text-green-600">Session ID: {sessionData.sessionId}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 