import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelHeader } from '@/components/editor/panels/PanelHeader';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('PanelHeader', () => {
  describe('rendering', () => {
    it('should render title', () => {
      render(<PanelHeader title="Scenes" />);
      expect(screen.getByText('Scenes')).toBeInTheDocument();
    });

    it('should render count when provided', () => {
      render(<PanelHeader title="Scenes" count={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should not render count when undefined', () => {
      render(<PanelHeader title="Scenes" />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should render count of 0 when explicitly set', () => {
      render(<PanelHeader title="Scenes" count={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PanelHeader title="Test" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('add button', () => {
    it('should render add button when onAdd is provided', () => {
      const onAdd = vi.fn();
      render(<PanelHeader title="Scenes" onAdd={onAdd} />);

      const button = screen.getByTitle('Add');
      expect(button).toBeInTheDocument();
    });

    it('should not render add button when onAdd is not provided', () => {
      render(<PanelHeader title="Scenes" />);
      expect(screen.queryByTitle('Add')).not.toBeInTheDocument();
    });

    it('should call onAdd when add button is clicked', () => {
      const onAdd = vi.fn();
      render(<PanelHeader title="Scenes" onAdd={onAdd} />);

      fireEvent.click(screen.getByTitle('Add'));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('should use custom addLabel for button title', () => {
      const onAdd = vi.fn();
      render(<PanelHeader title="Scenes" onAdd={onAdd} addLabel="Add scene" />);

      expect(screen.getByTitle('Add scene')).toBeInTheDocument();
    });
  });

  describe('view link', () => {
    it('should render view link when viewHref is provided', () => {
      render(<PanelHeader title="Scenes" viewHref="/scenes" />);

      // Find the link by its href since Button with asChild renders as link
      const link = screen.getByRole('link', { name: '' });
      expect(link).toHaveAttribute('href', '/scenes');
    });

    it('should not render view link when viewHref is not provided', () => {
      render(<PanelHeader title="Scenes" />);
      // No link should be present
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should render all elements together', () => {
      const onAdd = vi.fn();
      render(
        <PanelHeader
          title="Characters"
          count={15}
          onAdd={onAdd}
          addLabel="Add character"
          viewHref="/characters"
        />
      );

      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      // Check the view link exists
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/characters');
      expect(screen.getByTitle('Add character')).toBeInTheDocument();
    });
  });
});
