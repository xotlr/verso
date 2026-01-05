import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntitySidebar } from '@/components/tapestry/EntitySidebar';
import type { SidebarEntity, HighlightState } from '@/lib/tapestry/types';
import { INITIAL_HIGHLIGHT_STATE } from '@/lib/tapestry';

// Test fixtures
const createCharacter = (overrides: Partial<SidebarEntity> = {}): SidebarEntity => ({
  id: 'char-1',
  nodeId: 'node-char-1',
  name: 'Alice Smith',
  type: 'character',
  color: '#FF5733',
  y: 0,
  height: 40,
  dialogueCount: 45,
  connectionCount: 12,
  barycenter: 0,
  ...overrides,
});

const createLocation = (overrides: Partial<SidebarEntity> = {}): SidebarEntity => ({
  id: 'loc-1',
  nodeId: 'node-loc-1',
  name: 'Central Park',
  type: 'location',
  color: '#33FF57',
  y: 0,
  height: 40,
  dialogueCount: 0,
  connectionCount: 5,
  barycenter: 0,
  ...overrides,
});

const defaultProps = {
  characters: [createCharacter()],
  locations: [createLocation()],
  highlightState: INITIAL_HIGHLIGHT_STATE,
  onEntityHover: vi.fn(),
  onEntityClick: vi.fn(),
  sidebarWidth: 200,
  paddingLeft: 16,
};

describe('EntitySidebar', () => {
  describe('rendering', () => {
    it('should render characters section when characters exist', () => {
      render(<EntitySidebar {...defaultProps} />);

      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should render locations section when locations exist', () => {
      render(<EntitySidebar {...defaultProps} />);

      expect(screen.getByText('Locations')).toBeInTheDocument();
      expect(screen.getByText('Central Park')).toBeInTheDocument();
    });

    it('should not render characters section when empty', () => {
      render(<EntitySidebar {...defaultProps} characters={[]} />);

      expect(screen.queryByText('Characters')).not.toBeInTheDocument();
    });

    it('should not render locations section when empty', () => {
      render(<EntitySidebar {...defaultProps} locations={[]} />);

      expect(screen.queryByText('Locations')).not.toBeInTheDocument();
    });

    it('should display correct dialogue count for characters', () => {
      render(<EntitySidebar {...defaultProps} />);

      // The dialogue count is shown in the stats
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('should display initials in avatar', () => {
      render(<EntitySidebar {...defaultProps} />);

      // "Alice Smith" should have initials "AS"
      expect(screen.getByText('AS')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have navigation landmark', () => {
      render(<EntitySidebar {...defaultProps} />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have section landmarks with labels', () => {
      render(<EntitySidebar {...defaultProps} />);

      expect(screen.getByRole('region', { name: 'Characters' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Locations' })).toBeInTheDocument();
    });

    it('should have accessible entity cards with aria-label', () => {
      render(<EntitySidebar {...defaultProps} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith, 45 lines, 12 scenes/i });
      expect(aliceCard).toBeInTheDocument();
    });

    it('should have aria-selected for highlighted entities', () => {
      const highlightState: HighlightState = {
        ...INITIAL_HIGHLIGHT_STATE,
        hoveredCharacterId: 'node-char-1',
      };

      render(<EntitySidebar {...defaultProps} highlightState={highlightState} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      expect(aliceCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should have focusable entity cards', () => {
      render(<EntitySidebar {...defaultProps} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      expect(aliceCard).toHaveAttribute('tabindex', '0');
    });
  });

  describe('interactions', () => {
    it('should call onEntityHover on mouse enter', () => {
      const onEntityHover = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityHover={onEntityHover} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.mouseEnter(aliceCard);

      expect(onEntityHover).toHaveBeenCalledWith('node-char-1');
    });

    it('should call onEntityHover with null on mouse leave', () => {
      const onEntityHover = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityHover={onEntityHover} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.mouseLeave(aliceCard);

      expect(onEntityHover).toHaveBeenCalledWith(null);
    });

    it('should call onEntityClick on click', () => {
      const onEntityClick = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityClick={onEntityClick} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.click(aliceCard);

      expect(onEntityClick).toHaveBeenCalledWith('node-char-1');
    });

    it('should call onEntityClick on Enter key', () => {
      const onEntityClick = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityClick={onEntityClick} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.keyDown(aliceCard, { key: 'Enter' });

      expect(onEntityClick).toHaveBeenCalledWith('node-char-1');
    });

    it('should call onEntityClick on Space key', () => {
      const onEntityClick = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityClick={onEntityClick} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.keyDown(aliceCard, { key: ' ' });

      expect(onEntityClick).toHaveBeenCalledWith('node-char-1');
    });

    it('should call onEntityHover on focus', () => {
      const onEntityHover = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityHover={onEntityHover} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.focus(aliceCard);

      expect(onEntityHover).toHaveBeenCalledWith('node-char-1');
    });

    it('should call onEntityHover with null on blur', () => {
      const onEntityHover = vi.fn();
      render(<EntitySidebar {...defaultProps} onEntityHover={onEntityHover} />);

      const aliceCard = screen.getByRole('option', { name: /Alice Smith/i });
      fireEvent.blur(aliceCard);

      expect(onEntityHover).toHaveBeenCalledWith(null);
    });
  });

  describe('highlight states', () => {
    it('should dim non-highlighted entities when one is highlighted', () => {
      const characters = [
        createCharacter({ id: 'char-1', nodeId: 'node-1', name: 'Alice' }),
        createCharacter({ id: 'char-2', nodeId: 'node-2', name: 'Bob' }),
      ];
      const highlightState: HighlightState = {
        ...INITIAL_HIGHLIGHT_STATE,
        hoveredCharacterId: 'node-1',
      };

      render(
        <EntitySidebar
          {...defaultProps}
          characters={characters}
          highlightState={highlightState}
        />
      );

      const aliceCard = screen.getByRole('option', { name: /Alice/i });
      const bobCard = screen.getByRole('option', { name: /Bob/i });

      expect(aliceCard).toHaveAttribute('aria-selected', 'true');
      expect(bobCard).toHaveAttribute('aria-selected', 'false');
      // Bob's card should have dimmed styling (opacity-30 class)
      expect(bobCard).toHaveClass('opacity-30');
    });
  });
});
