import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock DndKit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

// Mock the panel hooks
vi.mock('@/components/editor/panels/use-panel-dnd', () => ({
  usePanelDndSensors: () => [],
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Import after mocks
import { CharactersPanel } from '@/components/editor/panels/CharactersPanel';

// Sample character data
function createMockCharacter(overrides: Partial<CharacterInfo> = {}): CharacterInfo {
  return {
    id: 'char-1',
    name: 'JOHN',
    dialogueCount: 10,
    ...overrides,
  };
}

function createMockCharacters(count: number): CharacterInfo[] {
  const names = ['JOHN', 'SARAH', 'MIKE', 'EMMA', 'DAVID', 'LISA'];
  return Array.from({ length: count }, (_, i) => createMockCharacter({
    id: `char-${i + 1}`,
    name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
    dialogueCount: 100 - i * 10,
  }));
}

describe('CharactersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ roles: {} }),
    });
  });

  describe('rendering', () => {
    it('should show empty state when no characters', () => {
      render(<CharactersPanel characters={[]} />);
      expect(screen.getByText('No characters yet')).toBeInTheDocument();
    });

    it('should show description in empty state', () => {
      render(<CharactersPanel characters={[]} />);
      expect(screen.getByText('Characters appear as you add dialogue.')).toBeInTheDocument();
    });

    it('should render characters when provided', () => {
      const characters = [
        createMockCharacter({ id: 'char-1', name: 'JOHN' }),
        createMockCharacter({ id: 'char-2', name: 'SARAH' }),
      ];
      render(<CharactersPanel characters={characters} />);
      expect(screen.getByText('JOHN')).toBeInTheDocument();
      expect(screen.getByText('SARAH')).toBeInTheDocument();
    });

    it('should display dialogue count for characters', () => {
      const character = createMockCharacter({ dialogueCount: 42 });
      render(<CharactersPanel characters={[character]} />);
      expect(screen.getByText('42 lines')).toBeInTheDocument();
    });
  });

  describe('character sorting', () => {
    it('should sort characters by dialogue count (highest first)', () => {
      const characters = [
        createMockCharacter({ id: 'char-1', name: 'MINOR', dialogueCount: 5 }),
        createMockCharacter({ id: 'char-2', name: 'LEAD', dialogueCount: 100 }),
        createMockCharacter({ id: 'char-3', name: 'SUPPORT', dialogueCount: 50 }),
      ];
      render(<CharactersPanel characters={characters} />);

      const charElements = screen.getAllByText(/lines$/);
      expect(charElements[0]).toHaveTextContent('100 lines');
      expect(charElements[1]).toHaveTextContent('50 lines');
      expect(charElements[2]).toHaveTextContent('5 lines');
    });
  });

  describe('filtering', () => {
    it('should show search input when characters exist', () => {
      const characters = createMockCharacters(3);
      render(<CharactersPanel characters={characters} />);
      expect(screen.getByPlaceholderText('Search characters...')).toBeInTheDocument();
    });

    it('should filter characters by name', () => {
      const characters = [
        createMockCharacter({ id: 'char-1', name: 'JOHN SMITH' }),
        createMockCharacter({ id: 'char-2', name: 'SARAH JONES' }),
        createMockCharacter({ id: 'char-3', name: 'JOHNNY DEPP' }),
      ];
      render(<CharactersPanel characters={characters} />);

      const searchInput = screen.getByPlaceholderText('Search characters...');
      fireEvent.change(searchInput, { target: { value: 'JOHN' } });

      expect(screen.getByText('JOHN SMITH')).toBeInTheDocument();
      expect(screen.getByText('JOHNNY DEPP')).toBeInTheDocument();
      expect(screen.queryByText('SARAH JONES')).not.toBeInTheDocument();
    });

    it('should show no match message when filter has no results', () => {
      const characters = createMockCharacters(3);
      render(<CharactersPanel characters={characters} />);

      const searchInput = screen.getByPlaceholderText('Search characters...');
      fireEvent.change(searchInput, { target: { value: 'ZZZZZ' } });

      expect(screen.getByText('No characters match your filter.')).toBeInTheDocument();
    });
  });

  describe('role filtering', () => {
    it('should show role filter buttons', () => {
      const characters = createMockCharacters(3);
      render(<CharactersPanel characters={characters} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Lead')).toBeInTheDocument();
      expect(screen.getByText('Antag')).toBeInTheDocument();
      expect(screen.getByText('Supporting')).toBeInTheDocument();
      expect(screen.getByText('Minor')).toBeInTheDocument();
    });
  });


  describe('character avatar', () => {
    it('should display first letter of character name as avatar', () => {
      const character = createMockCharacter({ name: 'SARAH' });
      render(<CharactersPanel characters={[character]} />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should show rank indicators for top 3 characters', () => {
      const characters = createMockCharacters(5);
      render(<CharactersPanel characters={characters} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CharactersPanel characters={[]} className="custom-panel" />
      );
      expect(container.firstChild).toHaveClass('custom-panel');
    });
  });
});
