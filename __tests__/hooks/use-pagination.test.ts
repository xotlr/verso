import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { PaginationResult, PositionMap } from '@/lib/verso/types';

// Mock the entire verso module to avoid WASM loading
vi.mock('@/lib/verso', () => {
  const mockResult: PaginationResult = {
    pages: [
      {
        identifier: { type: 'Sequential', value: 1 },
        elements: [{ element_id: 'el-1', start_line: 0, line_count: 5, is_continuation: false }],
        lines_used: 5,
        pixel_y: 0,
        bottom_padding_px: 100,
      },
    ],
    element_positions: {
      'el-1': { pages: [{ type: 'Sequential', value: 1 }], start_line: 0, end_line: 5, is_split: false, height_px: 100 },
    },
    warnings: [],
    stats: {
      page_count: 1,
      element_count: 1,
      break_count: 0,
      continuation_count: 0,
      timing_us: 500,
    },
  };

  return {
    runPagination: vi.fn().mockResolvedValue(mockResult),
    serializeDocument: vi.fn().mockReturnValue([
      { id: 'el-1', element_type: 'action', content: 'Test' },
    ]),
    createPositionMap: vi.fn().mockReturnValue({
      posToElement: () => 'el-1',
      elementToPos: () => 0,
    }),
    DEFAULT_FEATURE_FILM_CONFIG: {
      paper_size: 'us_letter',
      lines_per_page: 55,
      margins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      element_styles: {},
      continuation_style: { enabled: true },
      orphan_control: {},
    },
  };
});

// Mock prosemirror plugins
vi.mock('@/lib/prosemirror/plugins', () => ({
  getAccumulatedChanges: vi.fn().mockReturnValue([]),
  createClearChangesTr: vi.fn((tr) => tr),
}));

// Mock constants
vi.mock('@/lib/constants/editor', () => ({
  PAGINATION_THROTTLE: {
    LARGE_DOC_THRESHOLD: 100,
    VERY_LARGE_DOC_THRESHOLD: 500,
    LARGE_INTERVAL: 500,
    VERY_LARGE_INTERVAL: 1000,
  },
}));

// Now import after mocks
import { usePagination, useCurrentPage } from '@/hooks/editor/use-pagination';
import { Schema } from 'prosemirror-model';
import * as verso from '@/lib/verso';

// Simple test schema
const testSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    text: { inline: true },
  },
});

function createDoc(text: string) {
  return testSchema.node('doc', null, [
    testSchema.node('paragraph', null, text ? [testSchema.text(text)] : []),
  ]);
}

describe('usePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('returns initial state with null doc', () => {
      const { result } = renderHook(() => usePagination(null));

      expect(result.current.result).toBeNull();
      expect(result.current.isPending).toBe(false);
      expect(result.current.pageCount).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isWasmReady).toBe(false);
    });

    it('does not run pagination when disabled', async () => {
      const doc = createDoc('Test');
      renderHook(() => usePagination(doc, { enabled: false }));

      await new Promise(r => setTimeout(r, 200));
      expect(verso.runPagination).not.toHaveBeenCalled();
    });
  });

  describe('pagination execution', () => {
    it('runs pagination when doc provided', async () => {
      const doc = createDoc('Test content');
      const { result } = renderHook(() => usePagination(doc));

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      expect(verso.runPagination).toHaveBeenCalled();
      expect(result.current.pageCount).toBe(1);
      expect(result.current.isWasmReady).toBe(true);
    });

    it('re-runs pagination on doc change', async () => {
      const doc1 = createDoc('First');
      const { result, rerender } = renderHook(
        ({ doc }) => usePagination(doc),
        { initialProps: { doc: doc1 } }
      );

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      const doc2 = createDoc('Second');
      rerender({ doc: doc2 });

      await waitFor(() => {
        expect(verso.runPagination).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('sets error on pagination failure', async () => {
      vi.mocked(verso.runPagination).mockRejectedValueOnce(new Error('WASM failed'));

      const doc = createDoc('Test');
      const { result } = renderHook(() => usePagination(doc));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('WASM failed');
      expect(result.current.isWasmReady).toBe(false);
    });
  });

  describe('page lookups', () => {
    it('returns null when no result', () => {
      const { result } = renderHook(() => usePagination(null));

      expect(result.current.getPageAtPosition(0)).toBeNull();
      expect(result.current.getPageForElement('el-1')).toBeNull();
    });

    it('looks up page for element ID', async () => {
      const doc = createDoc('Test');
      const { result } = renderHook(() => usePagination(doc));

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      const page = result.current.getPageForElement('el-1');
      expect(page).toEqual({ type: 'Sequential', value: 1 });
    });
  });

  describe('timing', () => {
    it('reports timing after pagination', async () => {
      const doc = createDoc('Test');
      const { result } = renderHook(() => usePagination(doc));

      await waitFor(() => {
        expect(result.current.timing).not.toBeNull();
      });

      expect(result.current.timing?.lastDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('useCurrentPage', () => {
  const mockResult: PaginationResult = {
    pages: [
      { identifier: { type: 'Sequential', value: 1 }, elements: [], lines_used: 5, pixel_y: 0, bottom_padding_px: 0 },
      { identifier: { type: 'Sequential', value: 2 }, elements: [], lines_used: 5, pixel_y: 1056, bottom_padding_px: 0 },
    ],
    element_positions: {
      'el-1': { pages: [{ type: 'Sequential', value: 1 }], start_line: 0, end_line: 5, is_split: false, height_px: 100 },
      'el-2': { pages: [{ type: 'Sequential', value: 2 }], start_line: 0, end_line: 5, is_split: false, height_px: 100 },
    },
    warnings: [],
    stats: { page_count: 2, element_count: 2, break_count: 1, continuation_count: 0, timing_us: 500 },
  };

  it('returns null without result', () => {
    const { result } = renderHook(() => useCurrentPage(null, 0, null));
    expect(result.current).toBeNull();
  });

  it('returns null without position map', () => {
    const { result } = renderHook(() => useCurrentPage(mockResult, 0, null));
    expect(result.current).toBeNull();
  });

  it('returns page for cursor position', () => {
    const posMap: PositionMap = {
      posToElement: (pos) => (pos < 50 ? 'el-1' : 'el-2'),
      elementToPos: (id) => (id === 'el-1' ? 0 : 50),
    };

    const { result, rerender } = renderHook(
      ({ pos }) => useCurrentPage(mockResult, pos, posMap),
      { initialProps: { pos: 10 } }
    );

    expect(result.current).toEqual({ type: 'Sequential', value: 1 });

    rerender({ pos: 60 });
    expect(result.current).toEqual({ type: 'Sequential', value: 2 });
  });
});
