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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  reportType: 'USER_PROFILE' | 'BOAT_PROFILE' | 'MESSAGE';
  reportedBoatId?: string;
  reportedMessageId?: string;
  reportedContent?: string; // For displaying message content or boat name
}

const reportReasons = [
  { value: 'INAPPROPRIATE_BEHAVIOR', label: 'Inappropriate Behavior' },
  { value: 'HARASSMENT', label: 'Harassment or Bullying' },
  { value: 'FAKE_PROFILE', label: 'Fake Profile' },
  { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
  { value: 'SPAM', label: 'Spam or Scam' },
  { value: 'OTHER', label: 'Other' },
];

const reportTypeLabels = {
  USER_PROFILE: 'User Profile',
  BOAT_PROFILE: 'Boat Profile',
  MESSAGE: 'Message',
};

export function ReportDialog({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reportType,
  reportedBoatId,
  reportedMessageId,
  reportedContent,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !description.trim()) {
      setError('Please select a reason and provide a description');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportedUserId,
          reportedBoatId,
          reportedMessageId,
          reportType,
          reason: selectedReason,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setSelectedReason('');
        setDescription('');
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to submit report');
      }

    } catch (error) {
      console.error('Report submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setDescription('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            🚨 Report {reportTypeLabels[reportType]}
          </DialogTitle>
          <DialogDescription>
            Report inappropriate or harmful content to help keep our community safe.
            Your report will be reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                ✅ Report submitted successfully! Our team will review it shortly.
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
              {/* Report Details */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="text-sm">
                  <strong>Reporting:</strong> {reportedUserName}
                </div>
                <div className="text-sm">
                  <strong>Type:</strong> {reportTypeLabels[reportType]}
                </div>
                {reportedContent && (
                  <div className="text-sm">
                    <strong>Content:</strong> 
                    <div className="mt-1 p-2 bg-white rounded border text-xs italic">
                      "{reportedContent}"
                    </div>
                  </div>
                )}
              </div>

              {/* Reason Selection */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for reporting *</Label>
                <Select onValueChange={setSelectedReason} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide details about why you're reporting this content..."
                  maxLength={1000}
                  disabled={isSubmitting}
                  className="min-h-[100px]"
                />
                <div className="text-xs text-gray-500 text-right">
                  {description.length}/1000 characters
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <strong>📋 Reporting Guidelines:</strong>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Only report content that violates our community guidelines</li>
                    <li>• Provide specific details to help our team investigate</li>
                    <li>• False reports may result in account restrictions</li>
                    <li>• For immediate safety concerns, use the SOS button</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {!success && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReason || !description.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </span>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 