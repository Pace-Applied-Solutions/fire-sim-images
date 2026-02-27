/**
 * Tests for ImageLightbox component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightbox } from '../ImageLightbox';
import type { GeneratedImage } from '@fire-sim/shared';

const mockImages: GeneratedImage[] = [
  {
    viewPoint: 'aerial',
    url: 'https://example.com/aerial.png',
    metadata: { width: 1024, height: 1024, model: 'gemini', prompt: 'Test prompt', generatedAt: '2026-01-01T00:00:00.000Z' },
  },
  {
    viewPoint: 'ground_north',
    url: 'https://example.com/ground.png',
    metadata: { width: 1024, height: 1024, model: 'gemini', prompt: 'Test prompt 2', generatedAt: '2026-01-01T00:00:01.000Z' },
  },
];

describe('ImageLightbox', () => {
  let mockOnClose: () => void;

  beforeEach(() => {
    mockOnClose = vi.fn();
  });

  it('renders the current image', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockImages[0].url);
    expect(img).toHaveAttribute('alt', 'aerial view');
  });

  it('calls onClose when close button is clicked', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const { container } = render(
      <ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />
    );
    // The overlay is the outermost div
    fireEvent.click(container.firstChild as Element);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to next image with ArrowRight key', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockImages[1].url);
  });

  it('navigates to previous image with ArrowLeft key', () => {
    render(<ImageLightbox images={mockImages} initialIndex={1} onClose={mockOnClose} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockImages[0].url);
  });

  it('shows navigation buttons when multiple images are present', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    expect(screen.getByTitle('Previous (←)')).toBeInTheDocument();
    expect(screen.getByTitle('Next (→)')).toBeInTheDocument();
  });

  it('does not show navigation buttons for a single image', () => {
    render(<ImageLightbox images={[mockImages[0]]} initialIndex={0} onClose={mockOnClose} />);
    expect(screen.queryByTitle('Previous (←)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Next (→)')).not.toBeInTheDocument();
  });

  it('shows image counter', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={mockOnClose} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
