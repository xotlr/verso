import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
});

// Mock DndKit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  DragOverlay: () => null,
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

// Mock the panel hooks
vi.mock('@/components/editor/panels/use-panel-dnd', () => ({
  usePanelDndSensors: () => [],
}));

// Mock EditorView for tests that need to bypass skeleton state
const createMockView = () => ({
  state: {
    doc: {
      forEach: vi.fn(),
    },
    tr: {
      setSelection: vi.fn().mockReturnThis(),
      scrollIntoView: vi.fn().mockReturnThis(),
    },
  },
  dispatch: vi.fn(),
  focus: vi.fn(),
}) as unknown as import('prosemirror-view').EditorView;

vi.mock('@/components/editor/panels/use-scene-selection', () => ({
  useSceneSelection: () => ({
    selectedScenes: new Set(),
    selectedCount: 0,
    isSelected: () => false,
    handleSelect: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock('@/components/editor/panels/use-act-management', () => ({
  useActManagement: () => ({
    hiddenActs: new Set(),
    editingActId: null,
    editingName: '',
    hiddenActsCount: 0,
    ungroupAct: vi.fn(),
    resetAllGroups: vi.fn(),
    groupScenes: vi.fn(),
    ungroupScenes: vi.fn(),
    startEditingAct: vi.fn(),
    saveActName: vi.fn(),
    cancelEditingAct: vi.fn(),
    setEditingName: vi.fn(),
    getActDisplayName: (act: { name: string }) => act.name,
    isActHidden: () => false,
    getSceneCustomGroup: () => null,
  }),
}));

// Import after mocks
import { ScenesPanel } from '@/components/editor/panels/ScenesPanel';

// Sample scene data
function createMockScene(overrides: Partial<SceneInfo> = {}): SceneInfo {
  return {
    id: 'scene-1',
    position: 0,
    type: 'INT',
    location: 'COFFEE SHOP',
    timeOfDay: 'DAY',
    sceneNumber: '1',
    ...overrides,
  };
}

function createMockScenes(count: number): SceneInfo[] {
  return Array.from({ length: count }, (_, i) => createMockScene({
    id: `scene-${i + 1}`,
    sceneNumber: `${i + 1}`,
    position: i * 100,
    type: i % 2 === 0 ? 'INT' : 'EXT',
    location: `LOCATION ${i + 1}`,
    timeOfDay: i % 3 === 0 ? 'NIGHT' : 'DAY',
  }));
}

describe('ScenesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should show empty state when no scenes', () => {
      // Need to provide a mock view to bypass the skeleton state
      const mockView = createMockView();
      render(<ScenesPanel scenes={[]} view={mockView} />);
      expect(screen.getByText('No scenes yet')).toBeInTheDocument();
    });

    it('should show description in empty state', () => {
      const mockView = createMockView();
      render(<ScenesPanel scenes={[]} view={mockView} />);
      expect(screen.getByText('Start writing to see your story structure.')).toBeInTheDocument();
    });

    it('should render scenes when provided', () => {
      const scenes = [
        createMockScene({ id: 'scene-1', location: 'COFFEE SHOP' }),
        createMockScene({ id: 'scene-2', location: 'OFFICE' }),
      ];
      render(<ScenesPanel scenes={scenes} view={null} />);
      expect(screen.getByText(/COFFEE SHOP/)).toBeInTheDocument();
      expect(screen.getByText(/OFFICE/)).toBeInTheDocument();
    });

    it('should format scene headings correctly', () => {
      const scene = createMockScene({ type: 'EXT', location: 'BEACH' });
      render(<ScenesPanel scenes={[scene]} view={null} />);
      expect(screen.getByText(/EXT\. BEACH/)).toBeInTheDocument();
    });
  });

  describe('scene list', () => {
    it('should render all scenes in a flat list', () => {
      const scenes = createMockScenes(15);
      render(<ScenesPanel scenes={scenes} view={null} />);
      // The panel shows scenes in a flat list (no act grouping)
      // Use exact text to avoid matching LOCATION 10-15
      expect(screen.getByText(/INT\. LOCATION 1$/)).toBeInTheDocument();
      expect(screen.getByText(/INT\. LOCATION 15$/)).toBeInTheDocument();
    });

    it('should show scene numbers', () => {
      const scenes = createMockScenes(5);
      render(<ScenesPanel scenes={scenes} view={null} />);
      // Scene numbers are displayed - getAllByText since there may be multiple matching scenes
      const sceneNumbers = screen.getAllByText(/^[1-5]$/);
      expect(sceneNumbers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('filtering', () => {
    it('should not show filters when less than 6 scenes', () => {
      const scenes = createMockScenes(5);
      render(<ScenesPanel scenes={scenes} view={null} />);
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    it('should show filters when more than 5 scenes', () => {
      const scenes = createMockScenes(6);
      render(<ScenesPanel scenes={scenes} view={null} />);
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should have scene type filter buttons', () => {
      const scenes = createMockScenes(6);
      render(<ScenesPanel scenes={scenes} view={null} />);
      // SceneFilters shows filter buttons with exact text (not scene headings)
      // Use exact match to distinguish from scene items like "INT. LOCATION"
      expect(screen.getByRole('button', { name: /^INT$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^EXT$/ })).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ScenesPanel scenes={[]} view={null} className="custom-panel" />
      );
      expect(container.firstChild).toHaveClass('custom-panel');
    });
  });
});
