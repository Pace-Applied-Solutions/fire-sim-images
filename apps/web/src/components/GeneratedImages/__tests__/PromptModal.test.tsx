/**
 * Tests for PromptModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptModal } from '../PromptModal';

describe('PromptModal', () => {
  const mockPrompt = 'Test prompt for bushfire scenario with detailed instructions';
  const mockViewpoint = 'aerial';
  let mockOnClose: () => void;

  beforeEach(() => {
    mockOnClose = vi.fn();
  });

  it('renders with prompt text', () => {
    render(
      <PromptModal
        prompt={mockPrompt}
        viewpoint={mockViewpoint}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Generation Prompt: Aerial/i)).toBeInTheDocument();
    expect(screen.getByText(mockPrompt)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <PromptModal
        prompt={mockPrompt}
        viewpoint={mockViewpoint}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    render(
      <PromptModal
        prompt={mockPrompt}
        viewpoint={mockViewpoint}
        onClose={mockOnClose}
      />
    );

    const overlay = screen.getByText(/Generation Prompt/i).closest('.overlay');
    if (overlay?.parentElement) {
      fireEvent.click(overlay.parentElement);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <PromptModal
        prompt={mockPrompt}
        viewpoint={mockViewpoint}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('formats viewpoint names correctly', () => {
    const testCases = [
      { viewpoint: 'aerial', expected: 'Aerial' },
      { viewpoint: 'helicopter_north', expected: 'Helicopter North' },
      { viewpoint: 'ground_south', expected: 'Ground South' },
    ];

    testCases.forEach(({ viewpoint, expected }) => {
      const { unmount } = render(
        <PromptModal
          prompt={mockPrompt}
          viewpoint={viewpoint}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(new RegExp(`Generation Prompt: ${expected}`, 'i'))).toBeInTheDocument();
      unmount();
    });
  });
});
