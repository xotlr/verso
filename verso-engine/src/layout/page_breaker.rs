//! Core pagination functions for screenplay layout.
//!
//! This module contains the main pagination entry points. The actual logic
//! is split across several focused modules:
//!
//! - [`constants`]: DPI and pixel conversion
//! - [`glue`]: Element pairing logic (CHARACTER + DIALOGUE, etc.)
//! - [`break_decision`]: Page break decision algorithms
//! - [`state`]: Pagination state management
//!
//! The pagination engine is pure and deterministic - the same input always
//! produces the same output, with no DOM measurement or external state.

use std::collections::HashMap;

use crate::types::{
    DocumentMetadata, Element, ElementPosition, ElementType, PageBreakReason,
    PageConfig, PageElement, PaginationCache, PaginationResult,
};
use super::{
    BreakDecision, ContinuationManager, LineCalculator, PaginationState,
    apply_locked_page_numbering, assign_scene_numbers, calculate_glue_group_cost,
    decide_break, detect_character_contd, find_dual_dialogue_groups, DualDialogueGroup,
    get_dual_group_space_before,
};

/// Core pagination function - pure, deterministic, no side effects.
///
/// For backward compatibility, assumes no title page and no metadata.
/// Use [`paginate_with_title_page`] for documents with title pages.
///
/// # Arguments
///
/// * `elements` - Screenplay elements to paginate
/// * `config` - Page configuration (margins, lines per page, etc.)
///
/// # Returns
///
/// A `PaginationResult` containing pages, element positions, and statistics.
///
/// # Example
///
/// ```
/// use verso_pagination_engine::types::{Element, ElementType, PageConfig};
/// use verso_pagination_engine::layout::paginate;
///
/// let config = PageConfig::feature_film();
/// let elements = vec![
///     Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
///     Element::new("2", ElementType::Action, "A busy office."),
/// ];
///
/// let result = paginate(&elements, &config);
/// assert_eq!(result.stats.page_count, 1);
/// ```
pub fn paginate(elements: &[Element], config: &PageConfig) -> PaginationResult {
    paginate_with_title_page(elements, config, false, None)
}

/// Pagination with explicit title page awareness and optional metadata.
///
/// When `has_title_page` is true:
/// - Title page is inserted as page 1 with pixel_y: 0
/// - All content pages start from page 2
/// - All pixel_y values include the title page offset
///
/// When `metadata` is provided:
/// - It is passed through to the result for frontend rendering
/// - Used for title page display and export headers
///
/// This makes WASM the single source of truth for all positioning.
/// JavaScript should use pixel_y values directly without any offset calculations.
///
/// # Arguments
///
/// * `elements` - Screenplay elements to paginate
/// * `config` - Page configuration
/// * `has_title_page` - Whether to include a title page
/// * `metadata` - Optional document metadata (title, author, etc.)
///
/// # Returns
///
/// A `PaginationResult` with title page (if enabled) and metadata attached.
pub fn paginate_with_title_page(
    elements: &[Element],
    config: &PageConfig,
    has_title_page: bool,
    metadata: Option<&DocumentMetadata>,
) -> PaginationResult {
    // Clone elements so we can mutate them for auto_contd and scene numbering
    let mut elements_mut = elements.to_vec();

    // Run character CONT'D detection if enabled
    if config.continuation_style.auto_contd_enabled {
        detect_character_contd(&mut elements_mut);
    }

    // Run scene numbering assignment
    assign_scene_numbers(&mut elements_mut, &config.scene_numbering);

    let line_calc = LineCalculator::new(config);
    let continuation_mgr = ContinuationManager::new(config);

    // Pre-compute dual dialogue groups for efficient lookup
    let dual_groups = find_dual_dialogue_groups(&elements_mut, config);

    // Build a map from element index -> dual dialogue group (if any)
    // This allows O(1) lookup during the main pagination loop
    let mut dual_group_map: HashMap<usize, usize> = HashMap::new();
    for (group_idx, group) in dual_groups.iter().enumerate() {
        for i in group.start_idx..group.end_idx {
            dual_group_map.insert(i, group_idx);
        }
    }

    let mut state = PaginationState::new(config, has_title_page);
    let element_count = elements_mut.len();

    // Track which dual dialogue groups we've already processed
    let mut processed_dual_groups: std::collections::HashSet<usize> = std::collections::HashSet::new();

    let mut idx = 0;
    while idx < elements_mut.len() {
        let element = &elements_mut[idx];

        // Track scene numbers: increment when we see a SceneHeading
        if element.element_type == ElementType::SceneHeading {
            state.current_scene_number += 1;
        }

        // Helper: check if next element (if any) is a SceneHeading
        let next_is_scene_heading = elements_mut
            .get(idx + 1)
            .map(|e| e.element_type == ElementType::SceneHeading)
            .unwrap_or(false);

        // Handle forced page break element
        if element.element_type == ElementType::PageBreak {
            if !state.at_page_start() {
                state.end_page(PageBreakReason::Forced, config, next_is_scene_heading);
            }
            idx += 1;
            continue;
        }

        // Check if this element is part of a dual dialogue group
        if let Some(&group_idx) = dual_group_map.get(&idx) {
            // Only process the group once (when we hit the first element)
            if !processed_dual_groups.contains(&group_idx) {
                processed_dual_groups.insert(group_idx);

                let group = &dual_groups[group_idx];
                let group_space_before = if state.at_page_start() {
                    0
                } else {
                    get_dual_group_space_before(&elements_mut, group, config) as u32
                };
                let group_total_cost = group_space_before + group.total_lines;
                let remaining = state.lines_remaining(config.lines_per_page) as u32;

                // Check if the entire dual dialogue group fits on current page
                if group_total_cost > remaining && !state.at_page_start() {
                    // Break before the dual dialogue group
                    state.end_page(PageBreakReason::OrphanPrevention, config, false);
                }

                // Check if the group exceeds a full page (generate warning)
                if group.total_lines > config.lines_per_page as u32 {
                    state.add_warning(
                        Some(&elements_mut[group.start_idx].id),
                        crate::types::WarningType::DualDialogueOverflow,
                        format!(
                            "Dual dialogue group requires {} lines but page only has {} lines. \
                            Consider shortening the dialogue.",
                            group.total_lines, config.lines_per_page
                        ),
                    );
                }

                // Add all elements in the dual dialogue group
                add_dual_dialogue_group(
                    &mut state,
                    &elements_mut,
                    group,
                    &line_calc,
                    config,
                );

                // Skip to the element after the dual dialogue group
                idx = group.end_idx;
                continue;
            } else {
                // This element is part of a group we've already processed
                idx += 1;
                continue;
            }
        }

        // Regular (non-dual-dialogue) element processing
        let lines = line_calc.calculate(element);

        // Calculate total space needed for this element alone
        let space_before = if state.at_page_start() { 0 } else { lines.space_before };
        let total_needed = space_before as u32 + lines.total_lines;

        let remaining = state.lines_remaining(config.lines_per_page) as u32;
        let current_y = state.current_page.lines_used as u32;

        // Calculate glue group cost (matches JS lookahead/glue logic)
        let (group_cost, _group_end) = calculate_glue_group_cost(&elements_mut, idx, config, current_y);

        // Check if the whole glue group exceeds remaining space
        let group_exceeds = group_cost > remaining;

        // Decide what to do
        let decision = decide_break(
            element,
            &lines,
            total_needed,
            remaining,
            config,
            &elements_mut[idx..],
            group_exceeds,
        );

        match decision {
            BreakDecision::Fits => {
                state.add_element(element, &lines, state.at_page_start());
            }

            BreakDecision::BreakBefore => {
                if !state.at_page_start() {
                    let current_is_scene_heading = element.element_type == ElementType::SceneHeading;
                    state.end_page(PageBreakReason::OrphanPrevention, config, current_is_scene_heading);
                }
                state.add_element(element, &lines, true);
            }

            BreakDecision::SplitAt { line } => {
                let at_page_start = state.at_page_start();

                // Split the element
                let split = if element.element_type == ElementType::Dialogue {
                    continuation_mgr.split_dialogue(element, &lines, line)
                } else {
                    continuation_mgr.split_action(&lines, line)
                };

                // Check if split is valid (has content on both sides)
                if split.first_part_lines > 0 && split.second_part_lines > 0 {
                    let first_page = state.current_page.identifier.clone();
                    let start_line = state.current_page.lines_used + space_before + 1;

                    // Add first part to current page
                    state.add_split_element_first_part(
                        element,
                        split.first_part_lines,
                        split.more_marker.clone(),
                        at_page_start,
                        lines.space_before,
                    );

                    // End page and start new one
                    state.end_page(PageBreakReason::DialogueContinuation, config, false);

                    let second_page = state.current_page.identifier.clone();

                    // Add second part to new page
                    state.add_split_element_second_part(
                        element,
                        split.first_part_lines,
                        split.second_part_lines,
                        split.contd_prefix,
                    );

                    // Record the split position
                    let total_lines = split.first_part_lines + split.second_part_lines;
                    state.record_split_position(
                        &element.id.0,
                        first_page,
                        second_page,
                        start_line,
                        split.second_part_lines as u8,
                        total_lines,
                        if at_page_start { 0 } else { lines.space_before },
                    );
                } else {
                    // Can't split meaningfully, push to next page
                    if !state.at_page_start() {
                        state.end_page(PageBreakReason::OrphanPrevention, config, false);
                    }
                    state.add_element(element, &lines, true);
                }
            }
        }

        // Handle forced page break after this element
        if element.force_page_break_after && !state.at_page_start() {
            state.end_page(PageBreakReason::Forced, config, next_is_scene_heading);
        }

        // Check for element exceeding page
        if lines.total_lines > config.lines_per_page as u32 {
            state.add_warning(
                Some(&element.id),
                crate::types::WarningType::ElementExceedsPage,
                format!(
                    "Element requires {} lines but page only has {} lines",
                    lines.total_lines, config.lines_per_page
                ),
            );
        }

        idx += 1;
    }

    // Finalize and apply post-processing
    let mut result = state.finalize(0, element_count, elements, config);

    // Apply locked page numbering if enabled (production script A-pages)
    if config.locked_pages.enabled {
        apply_locked_page_numbering(&mut result.pages, &config.locked_pages);
    }

    // Store metadata for frontend rendering (title page, exports)
    result.metadata = metadata.cloned();

    result
}

/// Incremental pagination with optional caching support.
///
/// This function provides the same functionality as [`paginate_with_title_page`] but
/// with support for incremental pagination. When a cache and changes are provided,
/// it will attempt to reuse pages that haven't changed, significantly improving
/// performance for large documents with localized edits.
///
/// # Arguments
///
/// * `elements` - The screenplay elements to paginate
/// * `config` - Page configuration
/// * `has_title_page` - Whether the document has a title page
/// * `metadata` - Optional document metadata for title page rendering
/// * `changes` - Optional list of changes since last pagination
/// * `cache` - Optional cache from previous pagination result
///
/// # Returns
///
/// A `PaginationResult` with a populated `cache` field that should be passed
/// to subsequent calls for incremental updates.
///
/// # Performance
///
/// - Without cache: O(n) where n is element count (full pagination)
/// - With cache and changes near end: O(k) where k is elements after first change
/// - Typical speedup for end-of-document edits: 5-10x
///
/// # Example
///
/// ```ignore
/// // Initial pagination
/// let result = paginate_incremental(&elements, &config, true, None, None, None);
/// let cache = result.cache.clone();
///
/// // After editing element at index 500
/// let changes = vec![DocumentChange::modify_single(500)];
/// let result = paginate_incremental(&elements, &config, true, None, Some(&changes), cache.as_ref());
/// ```
pub fn paginate_incremental(
    elements: &[Element],
    config: &PageConfig,
    has_title_page: bool,
    metadata: Option<&DocumentMetadata>,
    changes: Option<&[crate::types::DocumentChange]>,
    cache: Option<&PaginationCache>,
) -> PaginationResult {
    use super::{find_dirty_pages, extract_reusable_pages, merge_pages, DirtyReason};

    // Determine if we can use incremental pagination
    let dirty_region = match (changes, cache) {
        (Some(changes), Some(cache)) if !changes.is_empty() => {
            find_dirty_pages(changes, cache, elements, config, has_title_page)
        }
        _ => {
            super::DirtyRegion::full(DirtyReason::NoCache)
        }
    };

    // If full recalc needed, use the standard function and add cache
    if dirty_region.is_full_recalc() {
        let mut result = paginate_with_title_page(elements, config, has_title_page, metadata);
        result.cache = Some(PaginationCache::from_result(&result, elements, config, has_title_page));
        return result;
    }

    // Incremental pagination: reuse pages before the dirty region
    let previous_pages = cache
        .map(|c| &c.pages[..])
        .unwrap_or(&[]);

    let (reused_pages, start_element_idx) = extract_reusable_pages(
        previous_pages,
        &dirty_region,
        has_title_page,
    );

    // If we have reusable pages, do incremental pagination
    if !reused_pages.is_empty() && start_element_idx > 0 && start_element_idx < elements.len() {
        // Do full pagination but then merge with reused pages
        // This ensures correctness for auto_contd and scene numbering
        let mut full_result = paginate_with_title_page(elements, config, has_title_page, metadata);

        // Calculate how many pages to take from new result
        // (pages from dirty region onward)
        let pages_to_skip = reused_pages.len();

        if pages_to_skip < full_result.pages.len() {
            // Take new pages from the dirty region onward
            let new_pages: Vec<_> = full_result.pages.drain(pages_to_skip..).collect();

            // Merge reused pages with new pages
            let merged_pages = merge_pages(reused_pages, new_pages, &dirty_region);
            full_result.pages = merged_pages;
        }

        // Update cache with the final result
        full_result.cache = Some(PaginationCache::from_result(&full_result, elements, config, has_title_page));
        return full_result;
    }

    // Fall back to full pagination
    let mut result = paginate_with_title_page(elements, config, has_title_page, metadata);
    result.cache = Some(PaginationCache::from_result(&result, elements, config, has_title_page));

    result
}

/// Add all elements from a dual dialogue group to the current page.
///
/// Dual dialogue groups are treated as atomic units - all elements are added
/// together. The frontend handles the visual side-by-side rendering.
fn add_dual_dialogue_group(
    state: &mut PaginationState,
    elements: &[Element],
    group: &DualDialogueGroup,
    line_calc: &LineCalculator,
    config: &PageConfig,
) {
    let at_page_start = state.at_page_start();

    // Track the starting position for element position recording
    let space_before = if at_page_start {
        0
    } else {
        get_dual_group_space_before(elements, group, config)
    };

    let group_start_line = state.current_page.lines_used + space_before + 1;

    // Add each element in the group
    for &idx in group.left_elements.iter().chain(group.right_elements.iter()) {
        let element = &elements[idx];
        let lines = line_calc.calculate(element);

        let page_element = PageElement {
            element_id: element.id.clone(),
            start_line: group_start_line,
            line_count: lines.content_lines as u8,
            is_continuation: false,
            line_range: None,
            continuation_prefix: None,
        };

        state.current_page.elements.push(page_element);

        // Calculate exact container height in pixels for CSS quantization
        // Dual dialogue elements share group's space_before only for the first element
        let element_space = if idx == group.left_elements[0] ||
                              (group.right_elements.first() == Some(&idx) && group.left_elements.is_empty()) {
            space_before
        } else {
            0
        };
        let total_lines = element_space as f32 + lines.content_lines as f32;
        let height_px = total_lines * state.line_height_px;

        // Track element position
        state.element_positions.insert(
            element.id.0.clone(),
            ElementPosition {
                pages: vec![state.current_page.identifier.clone()],
                start_line: group_start_line,
                end_line: group_start_line + lines.content_lines as u8 - 1,
                is_split: false,
                height_px,
            },
        );
    }

    // Update lines_used based on the group's total height
    state.current_page.lines_used += space_before + group.total_lines as u8;
}

#[cfg(test)]
mod tests;
