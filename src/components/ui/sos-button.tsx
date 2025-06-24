'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SOSButtonProps {
  className?: string;
  variant?: 'floating' | 'inline';
}

export function SOSButton({ className = '', variant = 'floating' }: SOSButtonProps) {
  const { user } = useUser();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);

  // Get user's current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(position);
        },
        (error) => {
          console.error('Location error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  }, []);

  const handleSOSClick = () => {
    setError(null);
    setSuccess(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmSOS = async () => {
    setIsActivating(true);
    setError(null);

    try {
      // Prepare location data
      const coordinates = userLocation ? {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      } : undefined;

      const response = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: customMessage.trim() || undefined,
          coordinates: coordinates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setCustomMessage('');
        
        // Auto-close dialog after 3 seconds
        setTimeout(() => {
          setShowConfirmDialog(false);
          setSuccess(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to send SOS alert');
      }

    } catch (error) {
      console.error('SOS Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send SOS alert');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setCustomMessage('');
    setError(null);
    setSuccess(false);
  };

  // Don't show SOS button if user is not logged in
  if (!user) {
    return null;
  }

  const buttonClasses = variant === 'floating'
    ? `fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 border-4 border-white`
    : `bg-red-600 hover:bg-red-700 text-white font-bold`;

  return (
    <>
      {/* SOS Button */}
      <Button
        onClick={handleSOSClick}
        className={`${buttonClasses} ${className}`}
        size={variant === 'floating' ? undefined : 'lg'}
        aria-label="Emergency SOS Alert"
      >
        {variant === 'floating' ? (
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">SOS</span>
          </div>
        ) : (
          <span className="flex items-center gap-2">
            🚨 Emergency SOS
          </span>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              🚨 Emergency SOS Alert
            </DialogTitle>
            <DialogDescription>
              This will immediately notify your emergency contact and the Floatr safety team. 
              Only use this in real emergencies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Message */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✅ SOS alert sent successfully! Emergency contacts have been notified.
                  This dialog will close automatically.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  ⚠️ {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Location Status */}
            <div className="text-sm text-gray-600">
              <strong>Location:</strong> {userLocation 
                ? `✅ Current location available (${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)})`
                : '⚠️ Location not available - will use last known boat location'
              }
            </div>

            {/* Optional Message */}
            {!success && (
              <div className="space-y-2">
                <label htmlFor="sos-message" className="text-sm font-medium">
                  Optional message (describe your emergency):
                </label>
                <Textarea
                  id="sos-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g., Engine failure, medical emergency, taking on water..."
                  maxLength={500}
                  disabled={isActivating}
                  className="min-h-[80px]"
                />
                <div className="text-xs text-gray-500 text-right">
                  {customMessage.length}/500 characters
                </div>
              </div>
            )}

            {/* Safety Information */}
            {!success && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• This will send SMS to your emergency contact</li>
                    <li>• Floatr safety team will be alerted</li>
                    <li>• Only use for real emergencies</li>
                    <li>• For immediate danger, call 911 or local emergency services</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {!success && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isActivating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSOS}
                disabled={isActivating}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isActivating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending SOS...
                  </span>
                ) : (
                  'Confirm SOS Alert'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 