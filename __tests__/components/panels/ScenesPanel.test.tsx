import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    it('should render panel header with title', () => {
      render(<ScenesPanel scenes={[]} view={null} />);
      expect(screen.getByText('Scenes')).toBeInTheDocument();
    });

    it('should render scene count in header', () => {
      const scenes = createMockScenes(5);
      render(<ScenesPanel scenes={scenes} view={null} />);
      // Find the count in header (has specific muted styling)
      const countElement = screen.getAllByText('5').find(
        (el) => el.className.includes('text-muted-foreground') && el.className.includes('ml-auto')
      );
      expect(countElement).toBeInTheDocument();
    });

    it('should show empty state when no scenes', () => {
      render(<ScenesPanel scenes={[]} view={null} />);
      expect(screen.getByText('No scenes yet')).toBeInTheDocument();
    });

    it('should show description in empty state', () => {
      render(<ScenesPanel scenes={[]} view={null} />);
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

    it('should display 0 for no scenes count', () => {
      render(<ScenesPanel scenes={[]} view={null} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('add button', () => {
    it('should render add button when onAddScene is provided', () => {
      const onAddScene = vi.fn();
      render(<ScenesPanel scenes={[]} view={null} onAddScene={onAddScene} />);
      expect(screen.getByTitle('Add scene')).toBeInTheDocument();
    });

    it('should not render add button when onAddScene is not provided', () => {
      render(<ScenesPanel scenes={[]} view={null} />);
      expect(screen.queryByTitle('Add scene')).not.toBeInTheDocument();
    });

    it('should call onAddScene when add button is clicked', () => {
      const onAddScene = vi.fn();
      render(<ScenesPanel scenes={[]} view={null} onAddScene={onAddScene} />);
      fireEvent.click(screen.getByTitle('Add scene'));
      expect(onAddScene).toHaveBeenCalledTimes(1);
    });
  });

  describe('act grouping', () => {
    it('should group scenes into acts', () => {
      const scenes = createMockScenes(15);
      render(<ScenesPanel scenes={scenes} view={null} />);
      expect(screen.getByText('Act 1')).toBeInTheDocument();
      expect(screen.getByText('Act 2')).toBeInTheDocument();
    });

    it('should show Act 1 for small number of scenes', () => {
      const scenes = createMockScenes(5);
      render(<ScenesPanel scenes={scenes} view={null} />);
      expect(screen.getByText('Act 1')).toBeInTheDocument();
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
      // FilterPill in compact mode shows icon only, label is in title
      expect(screen.getByTitle('INT')).toBeInTheDocument();
      expect(screen.getByTitle('EXT')).toBeInTheDocument();
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
