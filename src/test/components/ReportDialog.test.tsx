import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportDialog } from '@/components/ui/report-dialog';

// Mock fetch
global.fetch = vi.fn();

describe('ReportDialog Component', () => {
  const user = userEvent.setup();
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    reportedUserId: 'user-123',
    reportedUserName: 'John Doe',
    reportType: 'USER_PROFILE' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<ReportDialog {...defaultProps} />);
      
      expect(screen.getByText('🚨 Report User Profile')).toBeInTheDocument();
      expect(screen.getByText(/Report inappropriate or harmful content/)).toBeInTheDocument();
      expect(screen.getByText('Reporting: John Doe')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ReportDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('🚨 Report User Profile')).not.toBeInTheDocument();
    });

    it('renders correct title based on report type', () => {
      const { rerender } = render(<ReportDialog {...defaultProps} reportType="BOAT_PROFILE" />);
      expect(screen.getByText('🚨 Report Boat Profile')).toBeInTheDocument();
      
      rerender(<ReportDialog {...defaultProps} reportType="MESSAGE" />);
      expect(screen.getByText('🚨 Report Message')).toBeInTheDocument();
    });

    it('displays reported content when provided', () => {
      render(
        <ReportDialog 
          {...defaultProps} 
          reportType="MESSAGE"
          reportedContent="This is an inappropriate message"
        />
      );
      
      expect(screen.getByText('Content:')).toBeInTheDocument();
      expect(screen.getByText('"This is an inappropriate message"')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('shows validation error when submitting without required fields', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/Please select a reason and provide a description/)).toBeInTheDocument();
    });

    it('enables submit button when form is filled', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // Select reason
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Harassment or Bullying'));
      
      // Enter description
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'This user is harassing me');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows character count for description field', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Test description');
      
      expect(screen.getByText('16/1000 characters')).toBeInTheDocument();
    });

    it('closes dialog when cancel button is clicked', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Report Submission', () => {
    beforeEach(() => {
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { reportId: 'report-123' },
            }),
        })
      );
    });

    it('submits report with correct data', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // Fill form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Harassment or Bullying'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'This user is harassing me');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportedUserId: 'user-123',
            reportedBoatId: undefined,
            reportedMessageId: undefined,
            reportType: 'USER_PROFILE',
            reason: 'HARASSMENT',
            description: 'This user is harassing me',
          }),
        });
      });
    });

    it('submits boat report with boat ID', async () => {
      render(
        <ReportDialog 
          {...defaultProps} 
          reportType="BOAT_PROFILE"
          reportedBoatId="boat-456"
        />
      );
      
      // Fill form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Fake Profile'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'This boat profile is fake');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/report', expect.objectContaining({
          body: JSON.stringify(expect.objectContaining({
            reportedBoatId: 'boat-456',
            reportType: 'BOAT_PROFILE',
            reason: 'FAKE_PROFILE',
          })),
        }));
      });
    });

    it('submits message report with message ID', async () => {
      render(
        <ReportDialog 
          {...defaultProps} 
          reportType="MESSAGE"
          reportedMessageId="message-789"
          reportedContent="Inappropriate message content"
        />
      );
      
      // Fill form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Inappropriate Behavior'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'This message is inappropriate');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/report', expect.objectContaining({
          body: JSON.stringify(expect.objectContaining({
            reportedMessageId: 'message-789',
            reportType: 'MESSAGE',
            reason: 'INAPPROPRIATE_BEHAVIOR',
          })),
        }));
      });
    });

    it('shows success message after successful submission', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // Fill and submit form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Spam or Scam'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'This is spam');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Report submitted successfully/)).toBeInTheDocument();
      });
    });

    it('auto-closes dialog after successful submission', async () => {
      vi.useFakeTimers();
      
      render(<ReportDialog {...defaultProps} />);
      
      // Fill and submit form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Safety Concern'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Safety issue');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/Report submitted successfully/)).toBeInTheDocument();
      });
      
      // Fast forward timers to trigger auto-close
      vi.advanceTimersByTime(2000);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('shows loading state during submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<ReportDialog {...defaultProps} />);
      
      // Fill form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Other'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Other issue');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/Submitting.../)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when API call fails', async () => {
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: 'Failed to submit report',
            }),
        })
      );
      
      render(<ReportDialog {...defaultProps} />);
      
      // Fill and submit form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Harassment or Bullying'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Test error case');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to submit report/)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );
      
      render(<ReportDialog {...defaultProps} />);
      
      // Fill and submit form
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Safety Concern'));
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Test network error');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('prevents submission with empty description', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // Select reason but leave description empty
      const reasonSelect = screen.getByRole('combobox');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Spam or Scam'));
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      expect(submitButton).toBeDisabled();
    });

    it('prevents submission without reason selected', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      // Enter description but don't select reason
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      await user.type(descriptionField, 'Some description');
      
      const submitButton = screen.getByRole('button', { name: /submit report/i });
      expect(submitButton).toBeDisabled();
    });

    it('handles maximum description length', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      const longText = 'a'.repeat(1001); // Exceeds 1000 character limit
      
      await user.type(descriptionField, longText);
      
      // Should be truncated to 1000 characters
      expect(descriptionField).toHaveValue('a'.repeat(1000));
      expect(screen.getByText('1000/1000 characters')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels and ARIA attributes', () => {
      render(<ReportDialog {...defaultProps} />);
      
      expect(screen.getByLabelText(/reason for reporting/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('focuses properly when opened', () => {
      render(<ReportDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<ReportDialog {...defaultProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      reasonSelect.focus();
      expect(document.activeElement).toBe(reasonSelect);
      
      const descriptionField = screen.getByPlaceholderText(/Please provide details/);
      descriptionField.focus();
      expect(document.activeElement).toBe(descriptionField);
    });
  });
}); 