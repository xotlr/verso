/**
 * WASM Interface Contract Tests
 *
 * These tests verify that the TypeScript types in lib/verso/types.ts
 * remain compatible with the Rust WASM engine's expected input/output format.
 *
 * Purpose:
 * - Catch breaking changes in the WASM interface before they hit production
 * - Verify type parity between TypeScript and Rust
 * - Document expected behavior of the pagination engine
 *
 * Note: These tests use mock data to verify type shapes. Integration tests
 * with actual WASM calls are in the Rust test suite (cargo test).
 */

import { describe, it, expect } from 'vitest';
import type {
  Element,
  ElementType,
  PageConfig,
  PaginationResult,
  Page,
  PageIdentifier,
  PageElement,
  ElementPosition,
  PaginationStats,
  LayoutMetadata,
  DocumentStats,
  DocumentMetadata,
  PaginationCache,
  DocumentChange,
  ChangeType,
  MarginConfig,
  ElementStyle,
  ContinuationStyle,
  OrphanControlConfig,
  PaperSize,
  RevisionColor,
  WarningType,
  PaginationWarning,
  WorkerRequest,
  PaginateRequest,
  PaginateResponse,
} from '@/lib/verso/types';
import {
  displayPageIdentifier,
  comparePageIdentifiers,
  createModifyChange,
  createInsertChange,
  createDeleteChange,
} from '@/lib/verso/types';

// =============================================================================
// Element Type Contract Tests
// =============================================================================

describe('Element Type Contract', () => {
  const ALL_ELEMENT_TYPES: ElementType[] = [
    'scene_heading',
    'action',
    'character',
    'dialogue',
    'parenthetical',
    'transition',
    'shot',
    'super',
    'chyron',
    'flashback',
    'montage',
    'intercut',
    'dual_dialogue_left',
    'dual_dialogue_right',
    'act_break',
    'page_break',
    'blank_line',
  ];

  it('should include all 17 element types', () => {
    expect(ALL_ELEMENT_TYPES).toHaveLength(17);
  });

  it('should create valid Element with required fields only', () => {
    const element: Element = {
      id: '0',
      element_type: 'action',
      content: 'The sun rises over the city.',
    };

    expect(element.id).toBe('0');
    expect(element.element_type).toBe('action');
    expect(element.content).toBe('The sun rises over the city.');
    expect(element.character_name).toBeUndefined();
    expect(element.auto_contd).toBeUndefined();
  });

  it('should create valid character Element with all fields', () => {
    const character: Element = {
      id: '10',
      element_type: 'character',
      content: 'JOHN',
      character_name: 'JOHN',
      auto_contd: true,
    };

    expect(character.character_name).toBe('JOHN');
    expect(character.auto_contd).toBe(true);
  });

  it('should create valid scene_heading with scene number', () => {
    const sceneHeading: Element = {
      id: '5',
      element_type: 'scene_heading',
      content: 'INT. COFFEE SHOP - DAY',
      scene_number: '42',
    };

    expect(sceneHeading.scene_number).toBe('42');
  });

  it('should create valid dual dialogue element', () => {
    const dualLeft: Element = {
      id: '20',
      element_type: 'dual_dialogue_left',
      content: 'Left side dialogue',
      dual_dialogue_position: 'left',
    };

    const dualRight: Element = {
      id: '21',
      element_type: 'dual_dialogue_right',
      content: 'Right side dialogue',
      dual_dialogue_position: 'right',
    };

    expect(dualLeft.dual_dialogue_position).toBe('left');
    expect(dualRight.dual_dialogue_position).toBe('right');
  });

  it('should support force_page_break_after flag', () => {
    const element: Element = {
      id: '100',
      element_type: 'action',
      content: 'END OF ACT ONE',
      force_page_break_after: true,
    };

    expect(element.force_page_break_after).toBe(true);
  });
});

// =============================================================================
// Page Identifier Contract Tests
// =============================================================================

describe('PageIdentifier Contract', () => {
  it('should create Sequential page identifier', () => {
    const sequential: PageIdentifier = { type: 'Sequential', value: 42 };
    expect(sequential.type).toBe('Sequential');
    expect(sequential.value).toBe(42);
  });

  it('should create Inserted (A-page) identifier', () => {
    const inserted: PageIdentifier = {
      type: 'Inserted',
      value: { base: 47, suffix: 'A' },
    };
    expect(inserted.type).toBe('Inserted');
    expect(inserted.value.base).toBe(47);
    expect(inserted.value.suffix).toBe('A');
  });

  it('should create Omitted page identifier', () => {
    const omitted: PageIdentifier = { type: 'Omitted', value: 33 };
    expect(omitted.type).toBe('Omitted');
    expect(omitted.value).toBe(33);
  });

  it('should display page identifiers correctly', () => {
    expect(displayPageIdentifier({ type: 'Sequential', value: 1 })).toBe('1');
    expect(displayPageIdentifier({ type: 'Sequential', value: 100 })).toBe('100');
    expect(
      displayPageIdentifier({ type: 'Inserted', value: { base: 47, suffix: 'A' } })
    ).toBe('47A');
    expect(
      displayPageIdentifier({ type: 'Inserted', value: { base: 47, suffix: 'B' } })
    ).toBe('47B');
    expect(displayPageIdentifier({ type: 'Omitted', value: 5 })).toBe('5 OMITTED');
  });

  it('should compare page identifiers for sorting', () => {
    const page1: PageIdentifier = { type: 'Sequential', value: 1 };
    const page2: PageIdentifier = { type: 'Sequential', value: 2 };
    const page47A: PageIdentifier = { type: 'Inserted', value: { base: 47, suffix: 'A' } };
    const page47B: PageIdentifier = { type: 'Inserted', value: { base: 47, suffix: 'B' } };
    const page48: PageIdentifier = { type: 'Sequential', value: 48 };

    expect(comparePageIdentifiers(page1, page2)).toBeLessThan(0);
    expect(comparePageIdentifiers(page2, page1)).toBeGreaterThan(0);
    expect(comparePageIdentifiers(page47A, page47B)).toBeLessThan(0);
    expect(comparePageIdentifiers(page47B, page48)).toBeLessThan(0);
  });
});

// =============================================================================
// Configuration Contract Tests
// =============================================================================

describe('PageConfig Contract', () => {
  it('should accept valid paper sizes', () => {
    const sizes: PaperSize[] = ['us_letter', 'a4'];
    expect(sizes).toContain('us_letter');
    expect(sizes).toContain('a4');
  });

  it('should create valid MarginConfig', () => {
    const margins: MarginConfig = {
      top: 72,
      bottom: 72,
      left: 108,
      right: 72,
    };

    expect(margins.top).toBe(72);
    expect(margins.left).toBe(108);
  });

  it('should create valid ElementStyle', () => {
    const actionStyle: ElementStyle = {
      margin_left: 0,
      margin_right: 0,
      max_chars_per_line: 61,
      space_before: 1,
      space_after: 0,
      line_spacing: 1,
      can_split: true,
      min_lines_before_split: 2,
      min_lines_after_split: 2,
      keep_with_next: false,
      keep_with_next_lines: 0,
      force_uppercase: false,
    };

    expect(actionStyle.max_chars_per_line).toBe(61);
    expect(actionStyle.can_split).toBe(true);
  });

  it('should create valid ContinuationStyle', () => {
    const style: ContinuationStyle = {
      more_marker: '(MORE)',
      contd_marker: "(CONT'D)",
      enabled: true,
      scene_continued_enabled: true,
      scene_continued_bottom: '(CONTINUED)',
      scene_continued_top: 'CONTINUED:',
      auto_contd_enabled: true,
    };

    expect(style.more_marker).toBe('(MORE)');
    expect(style.contd_marker).toBe("(CONT'D)");
  });

  it('should create valid OrphanControlConfig', () => {
    const orphanControl: OrphanControlConfig = {
      scene_heading_min_following: 2,
      character_min_dialogue_lines: 1,
      dialogue_min_before_split: 2,
      dialogue_min_after_split: 2,
    };

    expect(orphanControl.scene_heading_min_following).toBe(2);
  });
});

// =============================================================================
// Pagination Result Contract Tests
// =============================================================================

describe('PaginationResult Contract', () => {
  it('should create valid Page structure', () => {
    const page: Page = {
      identifier: { type: 'Sequential', value: 1 },
      elements: [
        {
          element_id: '0',
          start_line: 1,
          line_count: 3,
          is_continuation: false,
        },
      ],
      lines_used: 55,
      pixel_y: 0,
      bottom_padding_px: 96,
    };

    expect(page.identifier.type).toBe('Sequential');
    expect(page.elements).toHaveLength(1);
    expect(page.pixel_y).toBe(0);
    expect(page.bottom_padding_px).toBe(96);
  });

  it('should create valid PageElement structure', () => {
    const pageElement: PageElement = {
      element_id: '42',
      start_line: 10,
      line_count: 5,
      is_continuation: true,
      line_range: { start: 3, end: 7 },
      continuation_prefix: '(MORE)',
    };

    expect(pageElement.is_continuation).toBe(true);
    expect(pageElement.line_range?.start).toBe(3);
    expect(pageElement.continuation_prefix).toBe('(MORE)');
  });

  it('should create valid ElementPosition structure', () => {
    const position: ElementPosition = {
      pages: [{ type: 'Sequential', value: 5 }],
      start_line: 10,
      end_line: 15,
      is_split: false,
      height_px: 80,
    };

    expect(position.pages).toHaveLength(1);
    expect(position.height_px).toBe(80);
    expect(position.is_split).toBe(false);
  });

  it('should create valid LayoutMetadata (single source of truth)', () => {
    const layout: LayoutMetadata = {
      page_height_px: 1056,
      page_gap_px: 40,
      top_margin_px: 96,
      bottom_margin_px: 48,
      line_height_px: 16,
      has_title_page: true,
      title_page_offset_px: 1096,
      content_area_px: 912,
    };

    expect(layout.page_height_px).toBe(1056); // 11" at 96 DPI
    expect(layout.content_area_px).toBe(912); // page - margins
    expect(layout.has_title_page).toBe(true);
  });

  it('should create valid PaginationStats structure', () => {
    const stats: PaginationStats = {
      page_count: 120,
      element_count: 1500,
      break_count: 119,
      continuation_count: 25,
      timing_us: 45000,
      layout: {
        page_height_px: 1056,
        page_gap_px: 40,
        top_margin_px: 96,
        bottom_margin_px: 48,
        line_height_px: 16,
        has_title_page: false,
        title_page_offset_px: 0,
        content_area_px: 912,
      },
    };

    expect(stats.page_count).toBe(120);
    expect(stats.timing_us).toBe(45000); // 45ms
    expect(stats.layout?.page_height_px).toBe(1056);
  });

  it('should create valid DocumentStats structure', () => {
    const docStats: DocumentStats = {
      page_count: 110,
      estimated_runtime_minutes: 110,
      scene_count: 85,
      dialogue_block_count: 450,
      speaking_characters: ['ALICE', 'BOB', 'CHARLIE'],
      character_dialogue_lines: {
        ALICE: 150,
        BOB: 120,
        CHARLIE: 80,
      },
      action_dialogue_ratio: 0.45,
    };

    expect(docStats.estimated_runtime_minutes).toBe(110);
    expect(docStats.speaking_characters).toContain('ALICE');
    expect(docStats.character_dialogue_lines['BOB']).toBe(120);
    expect(docStats.action_dialogue_ratio).toBeCloseTo(0.45);
  });

  it('should create valid PaginationWarning structure', () => {
    const warningTypes: WarningType[] = [
      'element_exceeds_page',
      'unpreventable_orphan',
      'configuration_warning',
      'dual_dialogue_overflow',
    ];

    expect(warningTypes).toHaveLength(4);

    const warning: PaginationWarning = {
      element_id: '500',
      warning_type: 'element_exceeds_page',
      message: 'Action block exceeds page height',
    };

    expect(warning.warning_type).toBe('element_exceeds_page');
  });

  it('should create complete PaginationResult structure', () => {
    const result: PaginationResult = {
      pages: [
        {
          identifier: { type: 'Sequential', value: 1 },
          elements: [],
          lines_used: 0,
          pixel_y: 0,
          bottom_padding_px: 1056,
        },
      ],
      element_positions: {
        '0': {
          pages: [{ type: 'Sequential', value: 1 }],
          start_line: 1,
          end_line: 5,
          is_split: false,
          height_px: 64,
        },
      },
      warnings: [],
      stats: {
        page_count: 1,
        element_count: 1,
        break_count: 0,
        continuation_count: 0,
        timing_us: 1000,
      },
    };

    expect(result.pages).toHaveLength(1);
    expect(result.element_positions['0']).toBeDefined();
    expect(result.warnings).toHaveLength(0);
    expect(result.stats.page_count).toBe(1);
  });
});

// =============================================================================
// Document Metadata Contract Tests
// =============================================================================

describe('DocumentMetadata Contract', () => {
  const REVISION_COLORS: RevisionColor[] = [
    'white',
    'blue',
    'pink',
    'yellow',
    'green',
    'goldenrod',
    'buff',
    'salmon',
    'cherry',
  ];

  it('should include all 9 industry-standard revision colors', () => {
    expect(REVISION_COLORS).toHaveLength(9);
  });

  it('should create valid DocumentMetadata with all fields', () => {
    const metadata: DocumentMetadata = {
      title: 'THE GREAT SCREENPLAY',
      author: 'Jane Writer',
      contact: 'jane@example.com\n555-123-4567',
      draft: 'Third Draft',
      date: 'December 29, 2025',
      copyright: 'Copyright 2025 Jane Writer',
      notes: 'Based on a true story',
      revision_color: 'pink',
    };

    expect(metadata.title).toBe('THE GREAT SCREENPLAY');
    expect(metadata.revision_color).toBe('pink');
  });

  it('should allow partial DocumentMetadata', () => {
    const partial: DocumentMetadata = {
      title: 'Untitled Project',
    };

    expect(partial.title).toBe('Untitled Project');
    expect(partial.author).toBeUndefined();
  });
});

// =============================================================================
// Incremental Pagination Contract Tests
// =============================================================================

describe('Incremental Pagination Contract', () => {
  it('should create valid DocumentChange structures', () => {
    const change: DocumentChange = {
      start_index: 50,
      end_index: 55,
      change_type: 'modify',
    };

    expect(change.start_index).toBe(50);
    expect(change.end_index).toBe(55);
    expect(change.change_type).toBe('modify');
  });

  it('should support all change types', () => {
    const types: ChangeType[] = ['insert', 'delete', 'modify'];
    expect(types).toHaveLength(3);
  });

  it('should create DocumentChange via helper functions', () => {
    const modify = createModifyChange(100);
    expect(modify.start_index).toBe(100);
    expect(modify.end_index).toBe(101);
    expect(modify.change_type).toBe('modify');

    const insert = createInsertChange(50, 5);
    expect(insert.start_index).toBe(50);
    expect(insert.end_index).toBe(55);
    expect(insert.change_type).toBe('insert');

    const del = createDeleteChange(20, 3);
    expect(del.start_index).toBe(20);
    expect(del.end_index).toBe(23);
    expect(del.change_type).toBe('delete');
  });

  it('should create valid PaginationCache structure', () => {
    const cache: PaginationCache = {
      element_pages: { '0': 1, '50': 2, '100': 3 },
      page_boundaries: [0, 50, 100],
      config_hash: 123456789,
      element_count: 150,
      has_title_page: true,
    };

    expect(cache.element_pages['50']).toBe(2);
    expect(cache.page_boundaries).toHaveLength(3);
    expect(cache.config_hash).toBe(123456789);
    expect(cache.has_title_page).toBe(true);
  });
});

// =============================================================================
// Worker Message Protocol Contract Tests
// =============================================================================

describe('Worker Message Protocol Contract', () => {
  it('should create valid PaginateRequest', () => {
    const request: PaginateRequest = {
      type: 'paginate',
      requestId: 'req-123',
      elements: [
        { id: '0', element_type: 'action', content: 'Test content' },
      ],
      config: {} as PageConfig, // Minimal for type check
      hasTitlePage: true,
      metadata: { title: 'Test' },
    };

    expect(request.type).toBe('paginate');
    expect(request.requestId).toBe('req-123');
    expect(request.hasTitlePage).toBe(true);
  });

  it('should create valid PaginateResponse', () => {
    const response: PaginateResponse = {
      type: 'paginate',
      requestId: 'req-123',
      result: {
        pages: [],
        element_positions: {},
        warnings: [],
        stats: {
          page_count: 0,
          element_count: 0,
          break_count: 0,
          continuation_count: 0,
          timing_us: 0,
        },
      },
    };

    expect(response.type).toBe('paginate');
    expect(response.requestId).toBe('req-123');
    expect(response.result.pages).toHaveLength(0);
  });

  it('should validate worker request discriminated union', () => {
    const requests: WorkerRequest[] = [
      { type: 'init' },
      {
        type: 'paginate',
        requestId: 'r1',
        elements: [],
        config: {} as PageConfig,
      },
      {
        type: 'export_fountain',
        requestId: 'r2',
        elements: [],
      },
      {
        type: 'export_fdx',
        requestId: 'r3',
        elements: [],
      },
    ];

    expect(requests.map((r) => r.type)).toEqual([
      'init',
      'paginate',
      'export_fountain',
      'export_fdx',
    ]);
  });
});

// =============================================================================
// Type Compatibility Tests (JSON Serialization Round-Trip)
// =============================================================================

describe('JSON Serialization Compatibility', () => {
  it('should serialize and deserialize Element without data loss', () => {
    const original: Element = {
      id: '42',
      element_type: 'dialogue',
      content: 'Hello, World!',
      character_name: 'JOHN',
      auto_contd: true,
    };

    const serialized = JSON.stringify(original);
    const deserialized: Element = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
  });

  it('should serialize and deserialize PageIdentifier variants', () => {
    const identifiers: PageIdentifier[] = [
      { type: 'Sequential', value: 1 },
      { type: 'Inserted', value: { base: 47, suffix: 'A' } },
      { type: 'Omitted', value: 5 },
    ];

    const serialized = JSON.stringify(identifiers);
    const deserialized: PageIdentifier[] = JSON.parse(serialized);

    expect(deserialized).toEqual(identifiers);
  });

  it('should serialize and deserialize PaginationResult', () => {
    const result: PaginationResult = {
      pages: [
        {
          identifier: { type: 'Sequential', value: 1 },
          elements: [
            {
              element_id: '0',
              start_line: 1,
              line_count: 10,
              is_continuation: false,
            },
          ],
          lines_used: 10,
          pixel_y: 0,
          bottom_padding_px: 800,
        },
      ],
      element_positions: {
        '0': {
          pages: [{ type: 'Sequential', value: 1 }],
          start_line: 1,
          end_line: 10,
          is_split: false,
          height_px: 160,
        },
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

    const serialized = JSON.stringify(result);
    const deserialized: PaginationResult = JSON.parse(serialized);

    expect(deserialized.pages).toHaveLength(1);
    expect(deserialized.element_positions['0'].height_px).toBe(160);
    expect(deserialized.stats.timing_us).toBe(500);
  });

  it('should handle undefined optional fields in serialization', () => {
    const element: Element = {
      id: '0',
      element_type: 'action',
      content: 'Test',
      // character_name is undefined
    };

    const serialized = JSON.stringify(element);
    const deserialized: Element = JSON.parse(serialized);

    expect(deserialized.character_name).toBeUndefined();
    expect('character_name' in deserialized).toBe(false);
  });
});

// =============================================================================
// Edge Cases & Boundary Conditions
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty content in elements', () => {
    const element: Element = {
      id: '0',
      element_type: 'blank_line',
      content: '',
    };

    expect(element.content).toBe('');
  });

  it('should handle very long content strings', () => {
    const longContent = 'A'.repeat(10000);
    const element: Element = {
      id: '0',
      element_type: 'action',
      content: longContent,
    };

    expect(element.content.length).toBe(10000);
  });

  it('should handle unicode content', () => {
    const element: Element = {
      id: '0',
      element_type: 'dialogue',
      content: '你好世界 🌍 مرحبا بالعالم',
      character_name: 'MARÍA',
    };

    expect(element.content).toContain('🌍');
    expect(element.character_name).toContain('Í');
  });

  it('should handle page 0 (title page scenario)', () => {
    const page: Page = {
      identifier: { type: 'Sequential', value: 0 },
      elements: [],
      lines_used: 0,
      pixel_y: 0,
      bottom_padding_px: 1056,
    };

    expect(page.identifier.type).toBe('Sequential');
    expect((page.identifier as { value: number }).value).toBe(0);
  });

  it('should handle large page numbers', () => {
    const page: Page = {
      identifier: { type: 'Sequential', value: 999 },
      elements: [],
      lines_used: 55,
      pixel_y: 999 * (1056 + 40),
      bottom_padding_px: 96,
    };

    expect((page.identifier as { value: number }).value).toBe(999);
    expect(page.pixel_y).toBe(999 * (1056 + 40)); // 1094904
  });

  it('should handle empty pagination result', () => {
    const result: PaginationResult = {
      pages: [],
      element_positions: {},
      warnings: [],
      stats: {
        page_count: 0,
        element_count: 0,
        break_count: 0,
        continuation_count: 0,
        timing_us: 100,
      },
    };

    expect(result.pages).toHaveLength(0);
    expect(Object.keys(result.element_positions)).toHaveLength(0);
  });
});
