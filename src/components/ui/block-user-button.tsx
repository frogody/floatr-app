'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  isBlocked?: boolean;
  variant?: 'button' | 'icon' | 'minimal';
  className?: string;
  onBlockStatusChange?: (isBlocked: boolean) => void;
}

export function BlockUserButton({
  userId,
  userName,
  isBlocked = false,
  variant = 'button',
  className = '',
  onBlockStatusChange,
}: BlockUserButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAction = async () => {
    if (!isBlocked && !reason.trim()) {
      setError('Please provide a reason for blocking this user');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (isBlocked) {
        // Unblock user
        const response = await fetch(`/api/block?blockedUserId=${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to unblock user');
        }

        setSuccess(true);
        onBlockStatusChange?.(false);
        
        setTimeout(() => {
          setShowDialog(false);
          setSuccess(false);
        }, 1500);

      } else {
        // Block user
        const response = await fetch('/api/block', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blockedUserId: userId,
            reason: reason.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to block user');
        }

        setSuccess(true);
        onBlockStatusChange?.(true);
        setReason('');
        
        setTimeout(() => {
          setShowDialog(false);
          setSuccess(false);
        }, 1500);
      }

    } catch (error) {
      console.error('Block/Unblock error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowDialog(false);
      setReason('');
      setError(null);
      setSuccess(false);
    }
  };

  const buttonContent = () => {
    if (variant === 'icon') {
      return isBlocked ? '✅' : '🚫';
    }
    if (variant === 'minimal') {
      return isBlocked ? 'Unblock' : 'Block';
    }
    return isBlocked ? 'Unblock User' : 'Block User';
  };

  const buttonVariant = isBlocked ? 'outline' : 'destructive';
  const buttonClasses = `${className} ${
    variant === 'icon' ? 'w-8 h-8 p-0' : ''
  } ${
    variant === 'minimal' ? 'text-sm' : ''
  }`;

  return (
    <>
      <Button
        variant={buttonVariant}
        size={variant === 'minimal' ? 'sm' : 'default'}
        onClick={() => setShowDialog(true)}
        className={buttonClasses}
        title={isBlocked ? `Unblock ${userName}` : `Block ${userName}`}
      >
        {buttonContent()}
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isBlocked ? 'text-green-600' : 'text-red-600'}`}>
              {isBlocked ? '✅ Unblock User' : '🚫 Block User'}
            </DialogTitle>
            <DialogDescription>
              {isBlocked
                ? `Are you sure you want to unblock ${userName}? They will be able to see your profile and contact you again.`
                : `Are you sure you want to block ${userName}? This will prevent them from seeing your profile or contacting you.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Message */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✅ {isBlocked ? 'User unblocked' : 'User blocked'} successfully!
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

            {!success && (
              <>
                {/* User Info */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <strong>User:</strong> {userName}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID: {userId}
                  </div>
                </div>

                {/* Reason (only for blocking) */}
                {!isBlocked && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for blocking (optional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Inappropriate messages, harassment, spam..."
                      maxLength={500}
                      disabled={isProcessing}
                      className="min-h-[80px]"
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {reason.length}/500 characters
                    </div>
                  </div>
                )}

                {/* Block Effects Information */}
                <div className={`border rounded-lg p-3 ${isBlocked ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className={`text-sm ${isBlocked ? 'text-green-800' : 'text-yellow-800'}`}>
                    <strong>{isBlocked ? '✅ Unblocking will:' : '⚠️ Blocking will:'}</strong>
                    <ul className="mt-1 space-y-1 text-xs">
                      {isBlocked ? (
                        <>
                          <li>• Allow them to see your profile again</li>
                          <li>• Enable them to send you messages</li>
                          <li>• Show your boat in their discovery feed</li>
                          <li>• Restore normal interaction capabilities</li>
                        </>
                      ) : (
                        <>
                          <li>• Hide your profile from their view</li>
                          <li>• Prevent them from messaging you</li>
                          <li>• Remove your boat from their discovery</li>
                          <li>• Block all future interactions</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Additional Info */}
                {!isBlocked && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                      <strong>💡 Note:</strong> You can unblock users later in your privacy settings.
                      For serious safety concerns, consider reporting the user as well.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!success && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={isProcessing}
                variant={isBlocked ? 'default' : 'destructive'}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isBlocked ? 'Unblocking...' : 'Blocking...'}
                  </span>
                ) : (
                  isBlocked ? 'Confirm Unblock' : 'Confirm Block'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 