use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use super::{DocumentMetadata, ElementId, Page, PageIdentifier, PageConfig};

/// Document-level statistics calculated during pagination.
///
/// These statistics help writers understand their screenplay at a glance,
/// including runtime estimates, scene counts, and character dialogue distribution.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DocumentStats {
    /// Total page count
    pub page_count: u32,

    /// Estimated runtime in minutes (industry standard: 1 page ≈ 1 minute)
    pub estimated_runtime_minutes: f32,

    /// Total scene count (number of SceneHeading elements)
    pub scene_count: u32,

    /// Total dialogue blocks (CHARACTER + DIALOGUE pairs)
    pub dialogue_block_count: u32,

    /// Unique character names that have dialogue, sorted alphabetically
    pub speaking_characters: Vec<String>,

    /// Character dialogue stats: character name -> number of dialogue lines
    pub character_dialogue_lines: HashMap<String, u32>,

    /// Action vs dialogue ratio (0.0 = all dialogue, 1.0 = all action)
    /// Calculated as: action_lines / (action_lines + dialogue_lines)
    pub action_dialogue_ratio: f32,
}

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

// ============================================================================
// Pagination Cache for Incremental Pagination
// ============================================================================

/// Cache of pagination results for incremental re-pagination.
///
/// This cache stores information about the previous pagination run,
/// allowing subsequent paginations to skip unchanged pages and only
/// recalculate from the point where changes occurred.
///
/// # Performance Benefits
///
/// For a 120-page script where only page 100 changed:
/// - Without cache: Must recalculate all 120 pages (~50ms)
/// - With cache: Reuse pages 1-99, recalculate 100+ (~10ms)
///
/// # Important Considerations
///
/// Page breaks ripple forward, so a change on page 5 may affect all
/// subsequent pages. The optimization is in skipping pages BEFORE the
/// first change, not after.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationCache {
    /// Element ID to page number mapping from last pagination.
    /// Key is element ID, value is the 1-indexed page number.
    pub element_pages: HashMap<String, u32>,

    /// Page boundaries: index i contains the element index where page i+1 starts.
    /// For example, if page_boundaries = [0, 52, 108], then:
    /// - Page 1 starts at element 0
    /// - Page 2 starts at element 52
    /// - Page 3 starts at element 108
    pub page_boundaries: Vec<usize>,

    /// Hash of the PageConfig used for the last pagination.
    /// If the config changes, we must do a full re-pagination.
    pub config_hash: u64,

    /// Total number of elements in the last pagination.
    /// Used to detect structural changes.
    pub element_count: usize,

    /// Whether the last pagination had a title page.
    pub has_title_page: bool,

    /// Cached pages from the previous pagination run.
    /// Used to reuse pages before the dirty region.
    pub pages: Vec<Page>,
}

impl PaginationCache {
    /// Create a new empty cache.
    pub fn new() -> Self {
        Self {
            element_pages: HashMap::new(),
            page_boundaries: Vec::new(),
            config_hash: 0,
            element_count: 0,
            has_title_page: false,
            pages: Vec::new(),
        }
    }

    /// Create a cache from pagination results.
    pub fn from_result(
        result: &PaginationResult,
        elements: &[super::Element],
        config: &PageConfig,
        has_title_page: bool,
    ) -> Self {
        let mut element_pages = HashMap::new();
        let mut page_boundaries = Vec::new();

        // Build element-to-page mapping from element_positions
        for (element_id, position) in &result.element_positions {
            if let Some(page_id) = position.pages.first() {
                let page_num = match page_id {
                    PageIdentifier::Sequential(n) => *n,
                    PageIdentifier::Inserted { base, .. } => *base,
                    PageIdentifier::Omitted(n) => *n,
                };
                element_pages.insert(element_id.clone(), page_num);
            }
        }

        // Build page boundaries from pages
        // For each page, find the first element index on that page
        for page in &result.pages {
            if let Some(first_elem) = page.elements.first() {
                // Find the index of this element in the original elements array
                let elem_idx = elements
                    .iter()
                    .position(|e| e.id.0 == first_elem.element_id.0)
                    .unwrap_or(0);
                page_boundaries.push(elem_idx);
            }
        }

        Self {
            element_pages,
            page_boundaries,
            config_hash: Self::hash_config(config),
            element_count: elements.len(),
            has_title_page,
            pages: result.pages.clone(),
        }
    }

    /// Compute a hash of the PageConfig for change detection.
    /// If the config changes, incremental pagination is not possible.
    pub fn hash_config(config: &PageConfig) -> u64 {
        let mut hasher = DefaultHasher::new();

        // Hash key config values that affect pagination
        config.lines_per_page.hash(&mut hasher);
        config.line_height_pt.to_bits().hash(&mut hasher);

        // Hash margins
        config.margins.top.to_bits().hash(&mut hasher);
        config.margins.bottom.to_bits().hash(&mut hasher);

        // Hash continuation settings
        config.continuation_style.enabled.hash(&mut hasher);
        config.continuation_style.scene_continued_enabled.hash(&mut hasher);

        // Hash orphan control
        config.orphan_control.scene_heading_min_following.hash(&mut hasher);
        config.orphan_control.character_min_dialogue_lines.hash(&mut hasher);
        config.orphan_control.dialogue_min_before_split.hash(&mut hasher);
        config.orphan_control.dialogue_min_after_split.hash(&mut hasher);

        // Hash locked pages config
        config.locked_pages.enabled.hash(&mut hasher);
        config.locked_pages.locked_page_count.hash(&mut hasher);

        hasher.finish()
    }

    /// Check if this cache is valid for the given config.
    pub fn is_valid_for_config(&self, config: &PageConfig) -> bool {
        self.config_hash == Self::hash_config(config)
    }

    /// Find the page number where a given element index would appear.
    /// Returns None if the element index is beyond cached boundaries.
    pub fn page_for_element_index(&self, element_index: usize) -> Option<u32> {
        // Binary search to find which page contains this element
        match self.page_boundaries.binary_search(&element_index) {
            Ok(page_idx) => Some(page_idx as u32 + 1),
            Err(0) => Some(1), // Before first boundary means page 1
            Err(page_idx) => Some(page_idx as u32),
        }
    }
}

impl Default for PaginationCache {
    fn default() -> Self {
        Self::new()
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

    /// Exact container height in pixels (content lines + space_before) * line_height
    /// CSS should use this to force element height and contain subpixel drift
    pub height_px: f32,
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

    /// Document-level statistics (scene count, character stats, etc.)
    #[serde(default)]
    pub document_stats: DocumentStats,

    /// Document metadata (title, author, draft info, etc.)
    /// Passed through from input for frontend rendering of title pages and exports
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<DocumentMetadata>,

    /// Cache for incremental pagination.
    /// Store this and pass it back on the next pagination call for faster updates.
    /// Only populated when using incremental pagination functions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache: Option<PaginationCache>,
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
            document_stats: DocumentStats::default(),
            metadata: None,
            cache: None,
        }
    }

    /// Create a new PaginationResult with metadata
    pub fn with_metadata(metadata: Option<DocumentMetadata>) -> Self {
        let mut result = Self::new();
        result.metadata = metadata;
        result
    }

    /// Create a new PaginationResult with cache
    pub fn with_cache(cache: Option<PaginationCache>) -> Self {
        let mut result = Self::new();
        result.cache = cache;
        result
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
