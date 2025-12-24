//! Pagination state management.
//!
//! This module contains the internal state structure used during pagination.
//! It tracks the current page, element positions, warnings, and layout metrics.

use std::collections::HashMap;

use crate::types::{
    Element, ElementId, ElementPosition, LayoutMetadata, Page, PageBreakReason,
    PageConfig, PageElement, PageIdentifier, PaginationResult, PaginationStats,
    PaginationWarning, WarningType, LineRange,
};
use super::{LineCalculation, PAGE_GAP_PX, points_to_pixels, calculate_document_stats};

/// Internal state during pagination.
///
/// This struct tracks all the mutable state needed while paginating a document:
/// - Current and completed pages
/// - Element positions for fast lookup
/// - Warnings generated during pagination
/// - Layout metrics calculated from config
///
/// The state is created fresh for each pagination run, ensuring determinism.
pub struct PaginationState {
    /// Completed pages
    pub pages: Vec<Page>,
    /// Current page being built
    pub current_page: Page,
    /// Current page number (1-indexed)
    pub page_number: u32,
    /// Map of element ID to position info
    pub element_positions: HashMap<String, ElementPosition>,
    /// Warnings generated during pagination
    pub warnings: Vec<PaginationWarning>,
    /// Number of page breaks
    pub break_count: usize,
    /// Number of dialogue continuations (MORE/CONT'D)
    pub continuation_count: usize,
    /// Line height in pixels (calculated from config)
    pub line_height_px: f32,
    /// Page height in pixels (calculated from config)
    pub page_height_px: f32,
    /// Top margin in pixels
    pub top_margin_px: f32,
    /// Bottom margin in pixels
    pub bottom_margin_px: f32,
    /// Content area = page_height - top_margin - bottom_margin
    pub content_area_px: f32,
    /// Cumulative pixel offset for page positioning
    pub cumulative_pixel_y: f32,
    /// Whether document has a title page
    pub has_title_page: bool,
    /// Offset from title page (0 if no title page)
    pub title_page_offset_px: f32,
    /// Current scene number (0 = no scene heading seen yet)
    /// Incremented each time we encounter a SceneHeading element
    pub current_scene_number: u32,
}

impl PaginationState {
    /// Create a new pagination state from config.
    ///
    /// Calculates all layout constants from the config and initializes
    /// the first page at the correct offset (accounting for title page).
    pub fn new(config: &PageConfig, has_title_page: bool) -> Self {
        // Calculate layout constants from config
        let line_height_px = points_to_pixels(config.line_height_pt);
        let page_height_px = points_to_pixels(config.paper_size.height_pt());
        let top_margin_px = points_to_pixels(config.margins.top_pt());
        let bottom_margin_px = points_to_pixels(config.margins.bottom_pt());
        let content_area_px = page_height_px - top_margin_px - bottom_margin_px;

        // Calculate title page offset: page height + gap between pages
        let title_page_offset_px = if has_title_page {
            page_height_px + PAGE_GAP_PX
        } else {
            0.0
        };

        // First content page number (1 if no title page, 2 if title page exists)
        let first_page_number = if has_title_page { 2 } else { 1 };

        // Starting pixel Y for first content page:
        // - If no title page: top_margin (96px) - content starts inside frame 1
        // - If title page: title_page_offset + top_margin (1096 + 96 = 1192px)
        let initial_pixel_y = title_page_offset_px + top_margin_px;

        Self {
            pages: Vec::new(),
            // First content page starts after title page offset (if any)
            current_page: Page::new_at_offset(
                PageIdentifier::Sequential(first_page_number),
                initial_pixel_y,
            ),
            page_number: first_page_number,
            element_positions: HashMap::new(),
            warnings: Vec::new(),
            break_count: 0,
            continuation_count: 0,
            line_height_px,
            page_height_px,
            top_margin_px,
            bottom_margin_px,
            content_area_px,
            cumulative_pixel_y: initial_pixel_y,
            has_title_page,
            title_page_offset_px,
            current_scene_number: 0,
        }
    }

    /// Get the number of lines remaining on the current page.
    pub fn lines_remaining(&self, lines_per_page: u8) -> u8 {
        lines_per_page.saturating_sub(self.current_page.lines_used)
    }

    /// Check if we're at the start of a page (no content yet).
    pub fn at_page_start(&self) -> bool {
        self.current_page.lines_used == 0
    }

    /// End the current page and start a new one.
    ///
    /// Scene continuation logic:
    /// - `scene_continues`: true if the scene continues onto the next page
    /// - `config`: PageConfig to read scene continuation settings from
    pub fn end_page_with_scene_continuation(
        &mut self,
        _reason: PageBreakReason,
        scene_continues: bool,
        config: &PageConfig,
    ) {
        // Calculate bottom_padding_px for the page being ended
        // This fills from content END to the physical page BOTTOM
        //
        // CRITICAL: Use actual page geometry, NOT lines_per_page!
        // - lines_per_page (55) is a capacity limit, not geometry
        // - Content area = page_height - top_margin - bottom_margin = 912px
        // - But 55 * 16 = 880px, leaving 32px unaccounted per page
        //
        // Correct formula: page_height - top_margin - (lines_used * line_height)
        // This gives exact distance from content end to page bottom edge
        let content_end = self.top_margin_px + (self.current_page.lines_used as f32 * self.line_height_px);
        self.current_page.bottom_padding_px = self.page_height_px - content_end;

        // Scene continuation markers (shooting script feature)
        // Show markers when:
        //   - scene_continued_enabled == true
        //   - current_scene_number > 0 (we've seen at least one scene heading)
        //   - scene_continues == true (next element is NOT SceneHeading)
        let show_scene_continuation = config.continuation_style.scene_continued_enabled
            && self.current_scene_number > 0
            && scene_continues;

        if show_scene_continuation {
            // Set bottom marker on current page (e.g., "(CONTINUED)")
            self.current_page.scene_continued_bottom =
                Some(config.continuation_style.scene_continued_bottom.clone());

            // Store scene number if configured
            if config.continuation_style.scene_continued_with_number {
                self.current_page.continued_scene_number = Some(self.current_scene_number);
            }
        }

        // In discrete mode, page frames are positioned at FIXED intervals:
        // Frame N (1-indexed) is at: (N-1) * (page_height + gap)
        //
        // pixel_y represents where content STARTS on each page.
        // Formula: pixel_y = (page_number - 1) * (page_height + gap) + top_margin
        //
        // The page_number already accounts for title page:
        // - With title page: first content page is #2, frame at 1*1096=1096, pixel_y=1192
        // - Without: first content page is #1, frame at 0*1096=0, pixel_y=96
        //
        // We're creating the NEXT page (page_number + 1), so frame_index = page_number
        self.cumulative_pixel_y = self.page_number as f32 * (self.page_height_px + PAGE_GAP_PX)
            + self.top_margin_px;

        let finished_page = std::mem::replace(
            &mut self.current_page,
            Page::new_at_offset(PageIdentifier::Sequential(self.page_number + 1), self.cumulative_pixel_y),
        );

        // Set top marker on the NEW page if scene continues (e.g., "CONTINUED:")
        if show_scene_continuation {
            self.current_page.scene_continued_top =
                Some(config.continuation_style.scene_continued_top.clone());

            if config.continuation_style.scene_continued_with_number {
                self.current_page.continued_scene_number = Some(self.current_scene_number);
            }
        }

        self.pages.push(finished_page);
        self.page_number += 1;
        self.break_count += 1;
    }

    /// Legacy end_page without scene continuation (for backward compatibility).
    pub fn end_page(&mut self, reason: PageBreakReason, config: &PageConfig, next_is_scene_heading: bool) {
        // Scene continues if next element is NOT a scene heading
        let scene_continues = !next_is_scene_heading;
        self.end_page_with_scene_continuation(reason, scene_continues, config);
    }

    /// Add a complete element to the current page.
    pub fn add_element(&mut self, element: &Element, line_calc: &LineCalculation, at_page_start: bool) {
        let space_before = if at_page_start { 0 } else { line_calc.space_before };
        let start_line = self.current_page.lines_used + space_before + 1;

        let page_element = PageElement {
            element_id: element.id.clone(),
            start_line,
            line_count: line_calc.content_lines as u8,
            is_continuation: false,
            line_range: None,
            continuation_prefix: None,
        };

        self.current_page.elements.push(page_element);
        self.current_page.lines_used += space_before + line_calc.total_lines as u8;

        // Calculate exact container height in pixels for CSS quantization
        // This includes space_before + content lines, all at line_height_px
        let total_lines = space_before as f32 + line_calc.content_lines as f32;
        let height_px = total_lines * self.line_height_px;

        // Track element position
        self.element_positions.insert(
            element.id.0.clone(),
            ElementPosition {
                pages: vec![self.current_page.identifier.clone()],
                start_line,
                end_line: start_line + line_calc.content_lines as u8 - 1,
                is_split: false,
                height_px,
            },
        );
    }

    /// Add the first part of a split element to the current page.
    pub fn add_split_element_first_part(
        &mut self,
        element: &Element,
        first_lines: u32,
        more_marker: Option<String>,
        at_page_start: bool,
        space_before: u8,
    ) {
        let actual_space = if at_page_start { 0 } else { space_before };
        let start_line = self.current_page.lines_used + actual_space + 1;

        let page_element = PageElement {
            element_id: element.id.clone(),
            start_line,
            line_count: first_lines as u8,
            is_continuation: false,
            line_range: Some(LineRange {
                start: 0,
                end: first_lines,
            }),
            continuation_prefix: None,
        };

        self.current_page.elements.push(page_element);
        self.current_page.lines_used += actual_space + first_lines as u8;

        // Set the MORE marker
        if more_marker.is_some() {
            self.current_page.bottom_continuation = more_marker;
            self.current_page.lines_used += 1; // MORE takes a line
            self.continuation_count += 1;
        }
    }

    /// Add the second part of a split element to the new page.
    pub fn add_split_element_second_part(
        &mut self,
        element: &Element,
        first_lines: u32,
        second_lines: u32,
        contd_prefix: Option<String>,
    ) {
        // Continuation character name if dialogue
        let extra_lines = if contd_prefix.is_some() { 1 } else { 0 };

        let page_element = PageElement {
            element_id: element.id.clone(),
            start_line: 1 + extra_lines,
            line_count: second_lines as u8,
            is_continuation: true,
            line_range: Some(LineRange {
                start: first_lines,
                end: first_lines + second_lines,
            }),
            continuation_prefix: contd_prefix,
        };

        self.current_page.elements.push(page_element);
        self.current_page.lines_used = extra_lines + second_lines as u8;
    }

    /// Record position information for a split element.
    pub fn record_split_position(
        &mut self,
        element_id: &str,
        first_page: PageIdentifier,
        second_page: PageIdentifier,
        start_line: u8,
        end_line: u8,
        total_lines: u32,
        space_before: u8,
    ) {
        // Calculate exact container height for the full element (both parts)
        // For split elements, CSS will need to handle the split separately
        // but we provide the total height for reference
        let total_with_space = space_before as f32 + total_lines as f32;
        let height_px = total_with_space * self.line_height_px;

        self.element_positions.insert(
            element_id.to_string(),
            ElementPosition {
                pages: vec![first_page, second_page],
                start_line,
                end_line,
                is_split: true,
                height_px,
            },
        );
    }

    /// Add a warning to the result.
    pub fn add_warning(&mut self, element_id: Option<&ElementId>, warning_type: WarningType, message: String) {
        self.warnings.push(PaginationWarning {
            element_id: element_id.cloned(),
            warning_type,
            message,
        });
    }

    /// Finalize pagination and produce the result.
    ///
    /// This consumes the state and produces the final PaginationResult,
    /// including inserting the title page if present.
    pub fn finalize(
        mut self,
        timing_us: u64,
        element_count: usize,
        elements: &[Element],
        config: &PageConfig,
    ) -> PaginationResult {
        // Add the last page if it has content
        if !self.current_page.elements.is_empty() {
            // Calculate bottom padding for the last page
            // Uses same formula as end_page(): page_height - top_margin - (lines_used * line_height)
            let content_end = self.top_margin_px + (self.current_page.lines_used as f32 * self.line_height_px);
            self.current_page.bottom_padding_px = self.page_height_px - content_end;

            self.pages.push(self.current_page);
        }

        // If title page exists, insert it as page 1 at the beginning
        if self.has_title_page {
            // Title page has no content elements (lines_used = 0)
            // So content_end = top_margin, bottom_padding = page_height - top_margin
            let title_page_bottom_padding = self.page_height_px - self.top_margin_px;

            let title_page = Page {
                identifier: PageIdentifier::Sequential(1),
                elements: Vec::new(),  // Title page has no content elements
                bottom_continuation: None,
                lines_used: 0,  // Not applicable for title page
                pixel_y: 0.0,  // Title page starts at document top
                bottom_padding_px: title_page_bottom_padding,
                scene_continued_bottom: None,
                scene_continued_top: None,
                continued_scene_number: None,
            };
            self.pages.insert(0, title_page);
        }

        let page_count = self.pages.len() as u32;

        // Calculate total lines across all pages for diagnostics
        let total_lines: u32 = self.pages.iter()
            .map(|p| p.lines_used as u32)
            .sum();

        let avg_lines = if element_count > 0 {
            total_lines as f32 / element_count as f32
        } else {
            0.0
        };

        // Build complete layout metadata - SINGLE SOURCE OF TRUTH
        let layout = LayoutMetadata {
            page_height_px: self.page_height_px,
            page_gap_px: PAGE_GAP_PX,
            top_margin_px: self.top_margin_px,
            bottom_margin_px: self.bottom_margin_px,
            line_height_px: self.line_height_px,
            has_title_page: self.has_title_page,
            title_page_offset_px: self.title_page_offset_px,
            content_area_px: self.content_area_px,
        };

        // Calculate document statistics
        let document_stats = calculate_document_stats(elements, page_count, config);

        PaginationResult {
            pages: self.pages,
            element_positions: self.element_positions,
            warnings: self.warnings,
            stats: PaginationStats {
                page_count,
                element_count,
                break_count: self.break_count,
                continuation_count: self.continuation_count,
                timing_us,
                total_lines,
                avg_lines_per_element: avg_lines,
                // Keep deprecated fields for backward compatibility
                line_height_px: self.line_height_px,
                page_height_px: self.page_height_px,
                page_gap_px: PAGE_GAP_PX,
                // New: complete layout metadata
                layout,
            },
            document_stats,
            // Metadata is set after finalize() returns
            metadata: None,
            // Cache is set by incremental pagination functions
            cache: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_state_without_title_page() {
        let config = PageConfig::feature_film();
        let state = PaginationState::new(&config, false);

        assert_eq!(state.page_number, 1);
        assert!(!state.has_title_page);
        assert_eq!(state.title_page_offset_px, 0.0);
        assert_eq!(state.current_scene_number, 0);
    }

    #[test]
    fn test_new_state_with_title_page() {
        let config = PageConfig::feature_film();
        let state = PaginationState::new(&config, true);

        assert_eq!(state.page_number, 2); // Content starts on page 2
        assert!(state.has_title_page);
        assert!(state.title_page_offset_px > 0.0);
    }

    #[test]
    fn test_lines_remaining() {
        let config = PageConfig::feature_film();
        let mut state = PaginationState::new(&config, false);

        assert_eq!(state.lines_remaining(55), 55);

        state.current_page.lines_used = 10;
        assert_eq!(state.lines_remaining(55), 45);

        state.current_page.lines_used = 55;
        assert_eq!(state.lines_remaining(55), 0);

        state.current_page.lines_used = 60; // Over capacity
        assert_eq!(state.lines_remaining(55), 0);
    }

    #[test]
    fn test_at_page_start() {
        let config = PageConfig::feature_film();
        let mut state = PaginationState::new(&config, false);

        assert!(state.at_page_start());

        state.current_page.lines_used = 1;
        assert!(!state.at_page_start());
    }

    #[test]
    fn test_end_page_increments_page_number() {
        let config = PageConfig::feature_film();
        let mut state = PaginationState::new(&config, false);
        state.current_page.lines_used = 10;

        assert_eq!(state.page_number, 1);
        state.end_page(PageBreakReason::Forced, &config, true);
        assert_eq!(state.page_number, 2);
        assert_eq!(state.pages.len(), 1);
    }

    #[test]
    fn test_add_warning() {
        let config = PageConfig::feature_film();
        let mut state = PaginationState::new(&config, false);

        state.add_warning(None, WarningType::ElementExceedsPage, "Test warning".to_string());

        assert_eq!(state.warnings.len(), 1);
        assert_eq!(state.warnings[0].message, "Test warning");
    }
}
