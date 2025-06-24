import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOSButton } from '@/components/ui/sos-button';

// Mock fetch
global.fetch = vi.fn();

describe('SOSButton Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock geolocation API
    const mockGeolocation = {
      getCurrentPosition: vi.fn((successCallback) => {
        successCallback({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
        });
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders floating SOS button by default', () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('SOS');
      expect(button).toHaveClass('fixed', 'bottom-6', 'right-6');
    });

    it('renders inline SOS button when variant is inline', () => {
      render(<SOSButton variant="inline" />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('🚨 Emergency SOS');
      expect(button).not.toHaveClass('fixed');
    });

    it('applies custom className', () => {
      render(<SOSButton className="custom-class" />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Dialog Interaction', () => {
    it('opens confirmation dialog when SOS button is clicked', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      expect(screen.getByText('🚨 Emergency SOS Alert')).toBeInTheDocument();
      expect(screen.getByText(/This will immediately notify your emergency contact/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm sos alert/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('closes dialog when cancel button is clicked', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText('🚨 Emergency SOS Alert')).not.toBeInTheDocument();
    });

    it('shows location status in dialog', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Current location available/)).toBeInTheDocument();
        expect(screen.getByText(/37.7749, -122.4194/)).toBeInTheDocument();
      });
    });

    it('allows entering custom emergency message', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const textarea = screen.getByPlaceholderText(/e.g., Engine failure/);
      await user.type(textarea, 'Engine failure, need immediate assistance');
      
      expect(textarea).toHaveValue('Engine failure, need immediate assistance');
      expect(screen.getByText('43/500 characters')).toBeInTheDocument();
    });
  });

  describe('SOS Alert Submission', () => {
    beforeEach(() => {
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                alertId: 'test-alert-id',
                status: 'ACTIVE',
              },
            }),
        })
      );
    });

    it('sends SOS alert when confirmed', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
          }),
        });
      });
    });

    it('sends custom message with SOS alert', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const textarea = screen.getByPlaceholderText(/e.g., Engine failure/);
      await user.type(textarea, 'Engine failure');
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Engine failure',
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
          }),
        });
      });
    });

    it('shows success message after successful submission', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/SOS alert sent successfully/)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      expect(screen.getByText(/Sending SOS.../)).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when API call fails', async () => {
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: 'Failed to send SOS alert',
            }),
        })
      );
      
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to send SOS alert/)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );
      
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      const confirmButton = screen.getByRole('button', { name: /confirm sos alert/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('shows warning when location is not available', async () => {
      // Mock geolocation failure
      const mockGeolocation = {
        getCurrentPosition: vi.fn((successCallback, errorCallback) => {
          errorCallback({ code: 1, message: 'User denied geolocation' });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
      });
      
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/Location not available/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      expect(button).toHaveAttribute('aria-label', 'Emergency SOS Alert');
    });

    it('supports keyboard navigation', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      
      expect(screen.getByText('🚨 Emergency SOS Alert')).toBeInTheDocument();
    });

    it('manages focus properly in dialog', async () => {
      render(<SOSButton />);
      
      const button = screen.getByRole('button', { name: /emergency sos alert/i });
      await user.click(button);
      
      // Dialog should be focused when opened
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Cancel button should be focusable
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);
    });
  });
}); 