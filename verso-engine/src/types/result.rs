use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{ElementId, Page, PageIdentifier};

/// Complete layout metadata - SINGLE SOURCE OF TRUTH for all positioning
/// JavaScript should use these values directly without any offset calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutMetadata {
    /// Page height in pixels (e.g., 1056 for US Letter at 96 DPI)
    pub page_height_px: f32,

    /// Gap between pages in pixels
    pub page_gap_px: f32,

    /// Top margin inside page (content starts here)
    pub top_margin_px: f32,

    /// Bottom margin inside page
    pub bottom_margin_px: f32,

    /// Line height in pixels
    pub line_height_px: f32,

    /// Whether document has a title page
    pub has_title_page: bool,

    /// Total offset from title page (0 if no title page)
    /// This equals page_height_px + page_gap_px when title page exists
    pub title_page_offset_px: f32,

    /// Content area height (page_height - top_margin - bottom_margin)
    pub content_area_px: f32,
}

impl Default for LayoutMetadata {
    fn default() -> Self {
        Self {
            page_height_px: 1056.0,  // 11" at 96 DPI
            page_gap_px: 40.0,
            top_margin_px: 96.0,     // 1" at 96 DPI
            bottom_margin_px: 48.0,  // 0.5" at 96 DPI
            line_height_px: 16.0,    // 12pt at 96 DPI
            has_title_page: false,
            title_page_offset_px: 0.0,
            content_area_px: 912.0,  // 1056 - 96 - 48
        }
    }
}

/// Position of an element in the paginated document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementPosition {
    /// Page(s) this element appears on
    pub pages: Vec<PageIdentifier>,

    /// Starting line on first page (1-indexed)
    pub start_line: u8,

    /// Ending line on last page (1-indexed)
    pub end_line: u8,

    /// Whether element was split across pages
    pub is_split: bool,
}

/// Warning generated during pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationWarning {
    pub element_id: Option<ElementId>,
    pub warning_type: WarningType,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WarningType {
    /// Element is longer than a full page
    ElementExceedsPage,

    /// Orphan could not be prevented
    UnpreventableOrphan,

    /// Unusual element configuration
    ConfigurationWarning,

    /// Dual dialogue layout issue
    DualDialogueOverflow,
}

/// Statistics about the pagination run
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationStats {
    /// Total page count
    pub page_count: u32,

    /// Total elements processed
    pub element_count: usize,

    /// Number of page breaks
    pub break_count: usize,

    /// Number of dialogue continuations (MORE/CONT'D)
    pub continuation_count: usize,

    /// Pagination timing in microseconds
    pub timing_us: u64,

    /// Debug: total lines used across all pages
    #[serde(default)]
    pub total_lines: u32,

    /// Debug: average lines per element (for diagnostics)
    #[serde(default)]
    pub avg_lines_per_element: f32,

    /// Layout: line height in pixels (at 96 DPI)
    /// DEPRECATED: Use layout.line_height_px instead
    #[serde(default)]
    pub line_height_px: f32,

    /// Layout: page height in pixels (at 96 DPI)
    /// DEPRECATED: Use layout.page_height_px instead
    #[serde(default)]
    pub page_height_px: f32,

    /// Layout: gap between pages in pixels
    /// DEPRECATED: Use layout.page_gap_px instead
    #[serde(default)]
    pub page_gap_px: f32,

    /// Complete layout metadata - SINGLE SOURCE OF TRUTH
    /// JavaScript should use this for ALL layout calculations
    #[serde(default)]
    pub layout: LayoutMetadata,
}

/// Complete result of pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationResult {
    /// All pages in order
    pub pages: Vec<Page>,

    /// Quick lookup: element ID -> position
    pub element_positions: HashMap<String, ElementPosition>,

    /// Any warnings generated
    pub warnings: Vec<PaginationWarning>,

    /// Statistics
    pub stats: PaginationStats,
}

impl PaginationResult {
    pub fn new() -> Self {
        let layout = LayoutMetadata::default();
        Self {
            pages: Vec::new(),
            element_positions: HashMap::new(),
            warnings: Vec::new(),
            stats: PaginationStats {
                page_count: 0,
                element_count: 0,
                break_count: 0,
                continuation_count: 0,
                timing_us: 0,
                total_lines: 0,
                avg_lines_per_element: 0.0,
                // Keep deprecated fields for backward compatibility
                line_height_px: layout.line_height_px,
                page_height_px: layout.page_height_px,
                page_gap_px: layout.page_gap_px,
                layout,
            },
        }
    }

    /// Get the page for a given element ID
    pub fn get_page_for_element(&self, element_id: &str) -> Option<&PageIdentifier> {
        self.element_positions
            .get(element_id)
            .and_then(|pos| pos.pages.first())
    }

    /// Get page count
    pub fn page_count(&self) -> u32 {
        self.stats.page_count
    }
}

impl Default for PaginationResult {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_result_new() {
        let result = PaginationResult::new();
        assert_eq!(result.pages.len(), 0);
        assert_eq!(result.stats.page_count, 0);
    }
}
