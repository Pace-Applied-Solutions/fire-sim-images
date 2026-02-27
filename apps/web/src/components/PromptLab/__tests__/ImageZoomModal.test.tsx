/**
 * Tests for ImageZoomModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageZoomModal } from '../ImageZoomModal';

describe('ImageZoomModal', () => {
  const mockImageUrl = 'https://example.com/image.png';
  let mockOnClose: () => void;

  beforeEach(() => {
    mockOnClose = vi.fn();
  });

  it('renders with the provided image', () => {
    render(<ImageZoomModal imageUrl={mockImageUrl} onClose={mockOnClose} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockImageUrl);
    expect(img).toHaveAttribute('alt', 'Zoomed image');
  });

  it('renders with a label when provided', () => {
    render(<ImageZoomModal imageUrl={mockImageUrl} label="Test label" onClose={mockOnClose} />);
    expect(screen.getByText('Test label')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test label');
  });

  it('calls onClose when close button is clicked', () => {
    render(<ImageZoomModal imageUrl={mockImageUrl} onClose={mockOnClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay background is clicked', () => {
    const { container } = render(
      <ImageZoomModal imageUrl={mockImageUrl} onClose={mockOnClose} />
    );
    // Click directly on the overlay element (not the modal content)
    fireEvent.click(container.firstChild as Element);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<ImageZoomModal imageUrl={mockImageUrl} onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the modal', () => {
    render(<ImageZoomModal imageUrl={mockImageUrl} onClose={mockOnClose} />);
    const img = screen.getByRole('img');
    fireEvent.click(img);
    // Clicking the image (inside the modal) should not close
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
