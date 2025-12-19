//! Incremental pagination support.
//!
//! This module provides functionality for incrementally re-paginating a document
//! when only a portion has changed. Instead of recalculating the entire document,
//! we identify which pages are affected by the changes and only recalculate those.
//!
//! # Key Insight
//!
//! Page breaks ripple forward: a change on page 5 may affect all subsequent pages.
//! The optimization is in skipping pages BEFORE the first change, not after.
//! This means:
//! - If page 100 changes, we can reuse pages 1-99
//! - If page 5 changes, we must recalculate pages 5-end
//!
//! # Usage
//!
//! ```ignore
//! // First pagination - no cache
//! let result = paginate_incremental(&elements, &config, true, None, None, None);
//! let cache = result.cache.clone();
//!
//! // User edits element at index 500
//! let changes = vec![DocumentChange::modify_single(500)];
//!
//! // Incremental pagination - reuses earlier pages
//! let result = paginate_incremental(&elements, &config, true, None, Some(&changes), cache.as_ref());
//! ```

use crate::types::{
    ChangeType, DocumentChange, Element, Page, PageConfig, PageIdentifier, PaginationCache,
};

/// Information about which parts of the document need recalculation.
#[derive(Debug, Clone)]
pub struct DirtyRegion {
    /// The first page that needs recalculation (1-indexed).
    /// Pages before this can be reused from the cache.
    pub start_page: u32,

    /// Element index where recalculation should begin.
    pub start_element_index: usize,

    /// Whether to recalculate all pages from start_page to the end.
    /// This is almost always true because page breaks ripple forward.
    pub recalc_to_end: bool,

    /// Reason for the dirty region (for debugging/logging).
    pub reason: DirtyReason,
}

/// Why a region is marked dirty.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DirtyReason {
    /// No cache available, full pagination required.
    NoCache,
    /// Config changed, full pagination required.
    ConfigChanged,
    /// Title page setting changed, full pagination required.
    TitlePageChanged,
    /// Element count changed significantly (insertions/deletions).
    ElementCountChanged,
    /// Content modified at the specified location.
    ContentModified,
}

impl DirtyRegion {
    /// Create a dirty region that requires full recalculation.
    pub fn full(reason: DirtyReason) -> Self {
        Self {
            start_page: 1,
            start_element_index: 0,
            recalc_to_end: true,
            reason,
        }
    }

    /// Create a dirty region starting at a specific page.
    pub fn from_page(page: u32, element_index: usize, reason: DirtyReason) -> Self {
        Self {
            start_page: page,
            start_element_index: element_index,
            recalc_to_end: true,
            reason,
        }
    }

    /// Check if this is a full recalculation (no optimization possible).
    pub fn is_full_recalc(&self) -> bool {
        self.start_page <= 1 && self.start_element_index == 0
    }
}

/// Determine which pages need recalculation based on document changes.
///
/// # Arguments
///
/// * `changes` - List of changes made to the document since last pagination.
/// * `cache` - Cache from the previous pagination run.
/// * `elements` - Current elements in the document.
/// * `config` - Current pagination configuration.
/// * `has_title_page` - Whether the document currently has a title page.
///
/// # Returns
///
/// A `DirtyRegion` describing which pages need recalculation.
///
/// # Algorithm
///
/// 1. If no cache, return full recalc.
/// 2. If config hash changed, return full recalc.
/// 3. If title page setting changed, return full recalc.
/// 4. Find the earliest changed element across all changes.
/// 5. Look up which page that element was on in the cache.
/// 6. Return that page as the start of the dirty region.
pub fn find_dirty_pages(
    changes: &[DocumentChange],
    cache: &PaginationCache,
    _elements: &[Element],
    config: &PageConfig,
    has_title_page: bool,
) -> DirtyRegion {
    // Check if cache is valid for current config
    if !cache.is_valid_for_config(config) {
        return DirtyRegion::full(DirtyReason::ConfigChanged);
    }

    // Check if title page setting changed
    if cache.has_title_page != has_title_page {
        return DirtyRegion::full(DirtyReason::TitlePageChanged);
    }

    // If no changes provided, this is suspicious - do full recalc to be safe
    if changes.is_empty() {
        return DirtyRegion::full(DirtyReason::NoCache);
    }

    // Find the earliest element index affected by any change
    let mut earliest_affected_index = usize::MAX;

    for change in changes {
        match change.change_type {
            ChangeType::Insert | ChangeType::Modify => {
                // For inserts and modifications, the start_index is the first affected element
                earliest_affected_index = earliest_affected_index.min(change.start_index);
            }
            ChangeType::Delete => {
                // For deletions, elements shift down, so start_index is the first affected
                // Everything from start_index onward has changed position
                earliest_affected_index = earliest_affected_index.min(change.start_index);
            }
        }
    }

    // If no valid changes, do full recalc
    if earliest_affected_index == usize::MAX {
        return DirtyRegion::full(DirtyReason::NoCache);
    }

    // Check for insertions/deletions that change element count
    // These invalidate the element-to-page mapping for everything after
    let has_structural_change = changes
        .iter()
        .any(|c| matches!(c.change_type, ChangeType::Insert | ChangeType::Delete));

    if has_structural_change {
        // With structural changes, element indices have shifted
        // We need to recalculate from the earliest affected point
        // but we can still reuse pages before that point

        // Look up which page the earliest affected index was on
        if let Some(page_num) = cache.page_for_element_index(earliest_affected_index) {
            // Account for title page offset if needed
            let actual_page = if has_title_page && page_num == 1 {
                2 // Content starts on page 2 with title page
            } else {
                page_num
            };

            return DirtyRegion::from_page(
                actual_page,
                earliest_affected_index,
                DirtyReason::ElementCountChanged,
            );
        }
    }

    // For pure modifications (no insertions/deletions), look up the page
    if let Some(page_num) = cache.page_for_element_index(earliest_affected_index) {
        // Account for title page offset if needed
        let actual_page = if has_title_page && page_num == 1 {
            2 // Content starts on page 2 with title page
        } else {
            page_num
        };

        return DirtyRegion::from_page(
            actual_page,
            earliest_affected_index,
            DirtyReason::ContentModified,
        );
    }

    // Fallback to full recalc if we can't determine the affected page
    DirtyRegion::full(DirtyReason::NoCache)
}

/// Extract reusable pages from a previous pagination result.
///
/// Given a dirty region, this function returns the pages that can be
/// reused without recalculation.
///
/// # Arguments
///
/// * `previous_pages` - Pages from the previous pagination result.
/// * `dirty` - The dirty region indicating where recalculation starts.
/// * `has_title_page` - Whether the document has a title page.
///
/// # Returns
///
/// A vector of pages that can be reused, and the element index where
/// recalculation should begin.
pub fn extract_reusable_pages(
    previous_pages: &[Page],
    dirty: &DirtyRegion,
    has_title_page: bool,
) -> (Vec<Page>, usize) {
    if dirty.is_full_recalc() {
        return (Vec::new(), 0);
    }

    // Calculate how many pages to keep
    // dirty.start_page is 1-indexed, we need 0-indexed for slicing
    let pages_to_keep = (dirty.start_page as usize).saturating_sub(1);

    // Handle title page: if has_title_page, page 1 is the title page
    // Content pages are numbered from 2, so we need to adjust
    let adjusted_pages_to_keep = if has_title_page && pages_to_keep > 0 {
        pages_to_keep
    } else {
        pages_to_keep
    };

    if adjusted_pages_to_keep == 0 || previous_pages.is_empty() {
        return (Vec::new(), dirty.start_element_index);
    }

    // Clone the pages we can reuse
    let reusable = previous_pages
        .iter()
        .take(adjusted_pages_to_keep)
        .cloned()
        .collect();

    (reusable, dirty.start_element_index)
}

/// Merge reused pages with newly paginated pages.
///
/// # Arguments
///
/// * `reused_pages` - Pages reused from the previous pagination.
/// * `new_pages` - Newly calculated pages from incremental pagination.
/// * `dirty` - The dirty region used for this pagination.
///
/// # Returns
///
/// The complete merged page list.
pub fn merge_pages(reused_pages: Vec<Page>, new_pages: Vec<Page>, _dirty: &DirtyRegion) -> Vec<Page> {
    if reused_pages.is_empty() {
        return new_pages;
    }

    let mut result = reused_pages;
    result.extend(new_pages);
    result
}

/// Calculate the starting state for incremental pagination.
///
/// When resuming pagination from a dirty region, we need to know:
/// - What page number to start with
/// - How many lines are used on the partial page (if any)
/// - The pixel offset for the first new page
///
/// # Arguments
///
/// * `reused_pages` - Pages that are being reused.
/// * `config` - Pagination configuration.
/// * `has_title_page` - Whether the document has a title page.
///
/// # Returns
///
/// Tuple of (next_page_number, starting_pixel_y)
pub fn calculate_resume_state(
    reused_pages: &[Page],
    config: &PageConfig,
    has_title_page: bool,
) -> (u32, f32) {
    if reused_pages.is_empty() {
        // Starting from scratch
        let first_page = if has_title_page { 2 } else { 1 };

        // Calculate pixel positions
        const DPI: f64 = 96.0;
        const PT_TO_PX: f64 = DPI / 72.0;
        const PAGE_GAP_PX: f32 = 40.0;

        let page_height_px = (config.paper_size.height_pt() * PT_TO_PX) as f32;
        let top_margin_px = (config.margins.top_pt() * PT_TO_PX) as f32;

        let title_offset = if has_title_page {
            page_height_px + PAGE_GAP_PX
        } else {
            0.0
        };

        let starting_y = title_offset + top_margin_px;

        return (first_page, starting_y);
    }

    // Resume after the last reused page
    let last_page = reused_pages.last().unwrap();
    let next_page_num = match &last_page.identifier {
        PageIdentifier::Sequential(n) => n + 1,
        PageIdentifier::Inserted { base, suffix } => {
            if *suffix == 'Z' {
                base + 1
            } else {
                // Continue with next suffix - but this is handled differently
                // For simplicity, just use base + 1
                base + 1
            }
        }
        PageIdentifier::Omitted(n) => n + 1,
    };

    // Calculate pixel position for the next page
    const DPI: f64 = 96.0;
    const PT_TO_PX: f64 = DPI / 72.0;
    const PAGE_GAP_PX: f32 = 40.0;

    let page_height_px = (config.paper_size.height_pt() * PT_TO_PX) as f32;
    let top_margin_px = (config.margins.top_pt() * PT_TO_PX) as f32;

    // Each page frame is at: (page_number - 1) * (page_height + gap)
    // pixel_y is where content starts: frame_position + top_margin
    let frame_position = (next_page_num - 1) as f32 * (page_height_px + PAGE_GAP_PX);
    let starting_y = frame_position + top_margin_px;

    (next_page_num, starting_y)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ElementType;

    fn make_cache_with_boundaries(boundaries: Vec<usize>, element_count: usize) -> PaginationCache {
        let mut cache = PaginationCache::new();
        cache.page_boundaries = boundaries;
        cache.element_count = element_count;
        cache.config_hash = PaginationCache::hash_config(&PageConfig::feature_film());
        cache
    }

    fn make_element(id: &str, content: &str) -> Element {
        Element::new(id, ElementType::Action, content)
    }

    #[test]
    fn test_dirty_region_full() {
        let dirty = DirtyRegion::full(DirtyReason::NoCache);
        assert!(dirty.is_full_recalc());
        assert_eq!(dirty.start_page, 1);
        assert_eq!(dirty.start_element_index, 0);
    }

    #[test]
    fn test_dirty_region_from_page() {
        let dirty = DirtyRegion::from_page(5, 200, DirtyReason::ContentModified);
        assert!(!dirty.is_full_recalc());
        assert_eq!(dirty.start_page, 5);
        assert_eq!(dirty.start_element_index, 200);
    }

    #[test]
    fn test_find_dirty_pages_no_cache() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..10).map(|i| make_element(&i.to_string(), "Test")).collect();
        let cache = PaginationCache::new();
        let changes = vec![DocumentChange::modify_single(5)];

        // Empty cache should trigger full recalc
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, false);
        assert!(dirty.is_full_recalc());
    }

    #[test]
    fn test_find_dirty_pages_config_changed() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..10).map(|i| make_element(&i.to_string(), "Test")).collect();

        // Create cache with different config hash
        let mut cache = make_cache_with_boundaries(vec![0, 50, 100], 150);
        cache.config_hash = 12345; // Different from actual config

        let changes = vec![DocumentChange::modify_single(5)];
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, false);

        assert!(dirty.is_full_recalc());
        assert_eq!(dirty.reason, DirtyReason::ConfigChanged);
    }

    #[test]
    fn test_find_dirty_pages_title_page_changed() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..10).map(|i| make_element(&i.to_string(), "Test")).collect();

        let mut cache = make_cache_with_boundaries(vec![0, 50, 100], 150);
        cache.has_title_page = false;

        let changes = vec![DocumentChange::modify_single(5)];

        // has_title_page = true but cache.has_title_page = false
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, true);

        assert!(dirty.is_full_recalc());
        assert_eq!(dirty.reason, DirtyReason::TitlePageChanged);
    }

    #[test]
    fn test_find_dirty_pages_modification() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..150).map(|i| make_element(&i.to_string(), "Test")).collect();

        // Cache: page 1 starts at 0, page 2 at 50, page 3 at 100
        let cache = make_cache_with_boundaries(vec![0, 50, 100], 150);

        // Modify element 75 (should be on page 2)
        let changes = vec![DocumentChange::modify_single(75)];
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, false);

        assert!(!dirty.is_full_recalc());
        assert_eq!(dirty.start_page, 2);
        assert_eq!(dirty.start_element_index, 75);
        assert_eq!(dirty.reason, DirtyReason::ContentModified);
    }

    #[test]
    fn test_find_dirty_pages_insertion() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..155).map(|i| make_element(&i.to_string(), "Test")).collect();

        let cache = make_cache_with_boundaries(vec![0, 50, 100], 150);

        // Insert 5 elements at position 60
        let changes = vec![DocumentChange::insert(60, 5)];
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, false);

        assert!(!dirty.is_full_recalc());
        assert_eq!(dirty.start_page, 2); // Page 2 is affected
        assert_eq!(dirty.reason, DirtyReason::ElementCountChanged);
    }

    #[test]
    fn test_find_dirty_pages_earliest_change() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..150).map(|i| make_element(&i.to_string(), "Test")).collect();

        let cache = make_cache_with_boundaries(vec![0, 50, 100], 150);

        // Multiple changes: element 110 and element 30
        let changes = vec![
            DocumentChange::modify_single(110), // Page 3
            DocumentChange::modify_single(30),  // Page 1
        ];
        let dirty = find_dirty_pages(&changes, &cache, &elements, &config, false);

        // Should use the earliest affected page (page 1)
        assert_eq!(dirty.start_page, 1);
        assert_eq!(dirty.start_element_index, 30);
    }

    #[test]
    fn test_extract_reusable_pages_full_recalc() {
        let pages = vec![
            Page::new(PageIdentifier::Sequential(1)),
            Page::new(PageIdentifier::Sequential(2)),
        ];
        let dirty = DirtyRegion::full(DirtyReason::NoCache);

        let (reused, start_idx) = extract_reusable_pages(&pages, &dirty, false);
        assert!(reused.is_empty());
        assert_eq!(start_idx, 0);
    }

    #[test]
    fn test_extract_reusable_pages_partial() {
        let pages = vec![
            Page::new(PageIdentifier::Sequential(1)),
            Page::new(PageIdentifier::Sequential(2)),
            Page::new(PageIdentifier::Sequential(3)),
            Page::new(PageIdentifier::Sequential(4)),
        ];
        let dirty = DirtyRegion::from_page(3, 100, DirtyReason::ContentModified);

        let (reused, start_idx) = extract_reusable_pages(&pages, &dirty, false);
        assert_eq!(reused.len(), 2); // Pages 1 and 2
        assert_eq!(start_idx, 100);
    }

    #[test]
    fn test_merge_pages_empty_reused() {
        let new_pages = vec![
            Page::new(PageIdentifier::Sequential(1)),
            Page::new(PageIdentifier::Sequential(2)),
        ];
        let dirty = DirtyRegion::full(DirtyReason::NoCache);

        let merged = merge_pages(Vec::new(), new_pages.clone(), &dirty);
        assert_eq!(merged.len(), 2);
    }

    #[test]
    fn test_merge_pages_with_reused() {
        let reused = vec![
            Page::new(PageIdentifier::Sequential(1)),
            Page::new(PageIdentifier::Sequential(2)),
        ];
        let new = vec![
            Page::new(PageIdentifier::Sequential(3)),
            Page::new(PageIdentifier::Sequential(4)),
        ];
        let dirty = DirtyRegion::from_page(3, 100, DirtyReason::ContentModified);

        let merged = merge_pages(reused, new, &dirty);
        assert_eq!(merged.len(), 4);
    }

    #[test]
    fn test_calculate_resume_state_empty() {
        let config = PageConfig::feature_film();

        let (page_num, _pixel_y) = calculate_resume_state(&[], &config, false);
        assert_eq!(page_num, 1);
    }

    #[test]
    fn test_calculate_resume_state_with_title_page() {
        let config = PageConfig::feature_film();

        let (page_num, _pixel_y) = calculate_resume_state(&[], &config, true);
        assert_eq!(page_num, 2); // First content page is 2 with title page
    }

    #[test]
    fn test_calculate_resume_state_after_pages() {
        let config = PageConfig::feature_film();
        let reused = vec![
            Page::new(PageIdentifier::Sequential(1)),
            Page::new(PageIdentifier::Sequential(2)),
            Page::new(PageIdentifier::Sequential(3)),
        ];

        let (page_num, _pixel_y) = calculate_resume_state(&reused, &config, false);
        assert_eq!(page_num, 4);
    }
}
