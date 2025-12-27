import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelEmptyState } from '@/components/editor/panels/PanelEmptyState';
import { Film, Users, FileText } from 'lucide-react';

describe('PanelEmptyState', () => {
  describe('rendering', () => {
    it('should render icon', () => {
      render(<PanelEmptyState icon={Film} title="No scenes" />);
      // Icon is rendered as an SVG
      const container = screen.getByText('No scenes').parentElement;
      expect(container?.querySelector('svg')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<PanelEmptyState icon={Film} title="No scenes yet" />);
      expect(screen.getByText('No scenes yet')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <PanelEmptyState
          icon={Film}
          title="No scenes"
          description="Start writing to see your scenes"
        />
      );
      expect(screen.getByText('Start writing to see your scenes')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(
        <PanelEmptyState icon={Film} title="No scenes" />
      );
      // Check that only one text element exists (the title)
      const textElements = container.querySelectorAll('p');
      expect(textElements.length).toBe(1);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PanelEmptyState
          icon={Film}
          title="No scenes"
          className="custom-empty-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-empty-class');
    });
  });

  describe('action button', () => {
    it('should render action button when action is provided', () => {
      const onClick = vi.fn();
      render(
        <PanelEmptyState
          icon={Film}
          title="No matching scenes"
          action={{ label: 'Clear filters', onClick }}
        />
      );
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('should not render action button when action is not provided', () => {
      render(<PanelEmptyState icon={Film} title="No scenes" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onClick when action button is clicked', () => {
      const onClick = vi.fn();
      render(
        <PanelEmptyState
          icon={Film}
          title="No scenes"
          action={{ label: 'Add scene', onClick }}
        />
      );

      fireEvent.click(screen.getByText('Add scene'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('different icons', () => {
    it('should render with Film icon', () => {
      render(<PanelEmptyState icon={Film} title="No scenes" />);
      expect(screen.getByText('No scenes')).toBeInTheDocument();
    });

    it('should render with Users icon', () => {
      render(<PanelEmptyState icon={Users} title="No characters" />);
      expect(screen.getByText('No characters')).toBeInTheDocument();
    });

    it('should render with FileText icon', () => {
      render(<PanelEmptyState icon={FileText} title="No notes" />);
      expect(screen.getByText('No notes')).toBeInTheDocument();
    });
  });

  describe('complete empty state', () => {
    it('should render full empty state with all props', () => {
      const onClick = vi.fn();
      render(
        <PanelEmptyState
          icon={Film}
          title="No matching scenes"
          description="Try adjusting your filters or search term"
          action={{ label: 'Clear filters', onClick }}
          className="test-class"
        />
      );

      expect(screen.getByText('No matching scenes')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or search term')).toBeInTheDocument();
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });
  });
});
