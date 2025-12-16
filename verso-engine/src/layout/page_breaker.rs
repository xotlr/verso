use std::collections::HashMap;

use crate::types::{
    Element, ElementId, ElementPosition, ElementType, LayoutMetadata, Page,
    PageBreakReason, PageConfig, PageElement, PageIdentifier, PaginationResult,
    PaginationStats, PaginationWarning, WarningType, LineRange,
};
use super::{ContinuationManager, LineCalculation, LineCalculator};

/// Standard screen DPI for pixel calculations
const DPI: f64 = 96.0;
/// Points to pixels conversion factor (96 DPI / 72 points per inch)
const PT_TO_PX: f64 = DPI / 72.0;
/// Gap between pages in pixels (must match CSS PAGE_GAP_PX)
const PAGE_GAP_PX: f32 = 40.0;

/// Convert points to pixels at 96 DPI
fn points_to_pixels(pt: f64) -> f32 {
    (pt * PT_TO_PX) as f32
}

/// Check if two elements form a "glue pair" that must stay together.
/// Matches JS implementation:
/// ```javascript
/// const isGluePair = (first, second) => {
///   if (first.type === 'CHARACTER') {
///     return second.type === 'DIALOGUE' || second.type === 'PARENTHETICAL';
///   }
///   if (first.type === 'PARENTHETICAL') {
///     return second.type === 'DIALOGUE';
///   }
///   return false;
/// };
/// ```
fn is_glue_pair(first: &Element, second: &Element) -> bool {
    match first.element_type {
        // Character must stick to Dialogue or Parenthetical
        ElementType::Character => {
            matches!(second.element_type, ElementType::Dialogue | ElementType::Parenthetical)
        }
        // Parenthetical must stick to Dialogue
        ElementType::Parenthetical => {
            matches!(second.element_type, ElementType::Dialogue)
        }
        _ => false,
    }
}

/// Calculate the total cost (in lines) for a glue group starting at index `start_idx`.
/// A glue group is a chain of elements that must stay together:
/// - CHARACTER + DIALOGUE
/// - CHARACTER + PARENTHETICAL + DIALOGUE
/// - PARENTHETICAL + DIALOGUE
///
/// Returns (group_cost, group_end_index) where group_end_index is exclusive.
fn calculate_glue_group_cost(
    elements: &[Element],
    start_idx: usize,
    config: &PageConfig,
    current_y: u32,
) -> (u32, usize) {
    let line_calc = LineCalculator::new(config);
    let first_element = &elements[start_idx];
    let first_lines = line_calc.calculate(first_element);

    // Calculate actual cost for first element (no margin if at top of page)
    let first_actual_cost = if current_y == 0 {
        first_lines.total_lines
    } else {
        first_lines.space_before as u32 + first_lines.total_lines
    };

    let mut group_cost = first_actual_cost;
    let mut group_end = start_idx + 1;
    let mut curr_element = first_element;

    // Walk forward collecting glued elements
    while group_end < elements.len() {
        let next_element = &elements[group_end];

        if is_glue_pair(curr_element, next_element) {
            let next_lines = line_calc.calculate(next_element);
            // Subsequent elements in group always include their margin
            group_cost += next_lines.space_before as u32 + next_lines.total_lines;
            curr_element = next_element;
            group_end += 1;
        } else {
            break;
        }
    }

    (group_cost, group_end)
}

/// Decision for how to handle an element at a page boundary
#[derive(Debug)]
enum BreakDecision {
    /// Element fits on current page
    Fits,

    /// Break page before this element (push to next page)
    BreakBefore,

    /// Split the element at the given line number
    SplitAt { line: u32 },
}

/// Internal state during pagination
struct PaginationState {
    pages: Vec<Page>,
    current_page: Page,
    page_number: u32,
    element_positions: HashMap<String, ElementPosition>,
    warnings: Vec<PaginationWarning>,
    break_count: usize,
    continuation_count: usize,
    /// Layout constants (calculated from config, in pixels)
    line_height_px: f32,
    page_height_px: f32,
    /// Page margins in pixels
    top_margin_px: f32,
    bottom_margin_px: f32,
    /// Content area = page_height - top_margin - bottom_margin
    content_area_px: f32,
    /// Cumulative pixel offset for page positioning (accounts for decoration height)
    cumulative_pixel_y: f32,
    /// Whether document has a title page
    has_title_page: bool,
    /// Offset from title page (0 if no title page)
    title_page_offset_px: f32,
}

impl PaginationState {
    fn new(config: &PageConfig, has_title_page: bool) -> Self {
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
        }
    }

    fn lines_remaining(&self, lines_per_page: u8) -> u8 {
        lines_per_page.saturating_sub(self.current_page.lines_used)
    }

    fn at_page_start(&self) -> bool {
        self.current_page.lines_used == 0
    }

    fn end_page(&mut self, _reason: PageBreakReason) {
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
        self.pages.push(finished_page);
        self.page_number += 1;
        self.break_count += 1;
    }

    fn add_element(&mut self, element: &Element, line_calc: &LineCalculation, at_page_start: bool) {
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

        // Track element position
        self.element_positions.insert(
            element.id.0.clone(),
            ElementPosition {
                pages: vec![self.current_page.identifier.clone()],
                start_line,
                end_line: start_line + line_calc.content_lines as u8 - 1,
                is_split: false,
            },
        );
    }

    fn add_split_element_first_part(
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

    fn add_split_element_second_part(
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

    fn record_split_position(&mut self, element_id: &str, first_page: PageIdentifier, second_page: PageIdentifier, start_line: u8, end_line: u8) {
        self.element_positions.insert(
            element_id.to_string(),
            ElementPosition {
                pages: vec![first_page, second_page],
                start_line,
                end_line,
                is_split: true,
            },
        );
    }

    fn add_warning(&mut self, element_id: Option<&ElementId>, warning_type: WarningType, message: String) {
        self.warnings.push(PaginationWarning {
            element_id: element_id.cloned(),
            warning_type,
            message,
        });
    }

    fn finalize(mut self, timing_us: u64, element_count: usize) -> PaginationResult {
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
        }
    }
}

/// Core pagination function - pure, deterministic, no side effects
///
/// For backward compatibility, assumes no title page.
/// Use `paginate_with_title_page` for documents with title pages.
pub fn paginate(elements: &[Element], config: &PageConfig) -> PaginationResult {
    paginate_with_title_page(elements, config, false)
}

/// Pagination with explicit title page awareness
///
/// When `has_title_page` is true:
/// - Title page is inserted as page 1 with pixel_y: 0
/// - All content pages start from page 2
/// - All pixel_y values include the title page offset
///
/// This makes WASM the single source of truth for all positioning.
/// JavaScript should use pixel_y values directly without any offset calculations.
pub fn paginate_with_title_page(
    elements: &[Element],
    config: &PageConfig,
    has_title_page: bool,
) -> PaginationResult {
    let line_calc = LineCalculator::new(config);
    let continuation_mgr = ContinuationManager::new(config);

    let mut state = PaginationState::new(config, has_title_page);
    let element_count = elements.len();

    for (idx, element) in elements.iter().enumerate() {
        // Handle forced page break element
        if element.element_type == ElementType::PageBreak {
            if !state.at_page_start() {
                state.end_page(PageBreakReason::Forced);
            }
            continue;
        }

        // Calculate lines for this element
        let lines = line_calc.calculate(element);

        // Calculate total space needed for this element alone
        let space_before = if state.at_page_start() { 0 } else { lines.space_before };
        let total_needed = space_before as u32 + lines.total_lines;

        let remaining = state.lines_remaining(config.lines_per_page) as u32;
        let current_y = state.current_page.lines_used as u32;

        // Calculate glue group cost (matches JS lookahead/glue logic)
        // This checks if CHARACTER+DIALOGUE or CHARACTER+PARENTHETICAL+DIALOGUE chains fit together
        let (group_cost, _group_end) = calculate_glue_group_cost(elements, idx, config, current_y);

        // Check if the whole glue group exceeds remaining space
        let group_exceeds = group_cost > remaining;

        // Decide what to do, passing glue group information
        let decision = decide_break(
            element,
            &lines,
            total_needed,
            remaining,
            config,
            &elements[idx..],
            group_exceeds,
        );

        match decision {
            BreakDecision::Fits => {
                state.add_element(element, &lines, state.at_page_start());
            }

            BreakDecision::BreakBefore => {
                if !state.at_page_start() {
                    state.end_page(PageBreakReason::OrphanPrevention);
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
                    state.end_page(PageBreakReason::DialogueContinuation);

                    let second_page = state.current_page.identifier.clone();

                    // Add second part to new page
                    state.add_split_element_second_part(
                        element,
                        split.first_part_lines,
                        split.second_part_lines,
                        split.contd_prefix,
                    );

                    // Record the split position
                    state.record_split_position(
                        &element.id.0,
                        first_page,
                        second_page,
                        start_line,
                        split.second_part_lines as u8,
                    );
                } else {
                    // Can't split meaningfully, push to next page
                    if !state.at_page_start() {
                        state.end_page(PageBreakReason::OrphanPrevention);
                    }
                    state.add_element(element, &lines, true);
                }
            }
        }

        // Handle forced page break after this element
        if element.force_page_break_after && !state.at_page_start() {
            state.end_page(PageBreakReason::Forced);
        }

        // Check for element exceeding page
        if lines.total_lines > config.lines_per_page as u32 {
            state.add_warning(
                Some(&element.id),
                WarningType::ElementExceedsPage,
                format!(
                    "Element requires {} lines but page only has {} lines",
                    lines.total_lines, config.lines_per_page
                ),
            );
        }
    }

    // Timing is measured by the JavaScript worker using performance.now()
    state.finalize(0, element_count)
}

/// Decide how to handle an element at a page boundary
fn decide_break(
    element: &Element,
    lines: &LineCalculation,
    total_needed: u32,
    remaining: u32,
    config: &PageConfig,
    upcoming: &[Element],
    glue_group_exceeds: bool,
) -> BreakDecision {
    // First check: Does the glue group exceed remaining space?
    // If so, break before (matches JS: if (groupCost > spaceRemaining) forceBreak = true)
    if glue_group_exceeds {
        return BreakDecision::BreakBefore;
    }

    // If it fits, we're done
    if total_needed <= remaining {
        // But check orphan rules for keep_with_next
        let style = config.style_for(element.element_type);
        if style.keep_with_next && upcoming.len() > 1 {
            // Check if we have room for this + required following lines
            let following_lines = estimate_following_lines(config, &upcoming[1..], style.keep_with_next_lines);
            if total_needed + following_lines > remaining {
                return BreakDecision::BreakBefore;
            }
        }

        // Additional orphan control for scene headings (Final Draft standard):
        // A Scene Heading must have at least 1 line after it
        // (heading + at least 1 line of content = 2 lines minimum)
        if element.element_type == ElementType::SceneHeading {
            let space_after = remaining.saturating_sub(total_needed);
            if space_after < 2 {
                return BreakDecision::BreakBefore;
            }
        }

        return BreakDecision::Fits;
    }

    let style = config.style_for(element.element_type);
    let orphan = &config.orphan_control;

    match element.element_type {
        // Scene heading: never split, push to next page
        ElementType::SceneHeading => {
            BreakDecision::BreakBefore
        }

        // Character: never split, needs dialogue after it
        ElementType::Character => {
            BreakDecision::BreakBefore
        }

        // Parenthetical: never split, keep with dialogue
        ElementType::Parenthetical => {
            BreakDecision::BreakBefore
        }

        // Dialogue: can split with MORE/CONT'D
        ElementType::Dialogue => {
            if !style.can_split {
                return BreakDecision::BreakBefore;
            }

            let min_before = orphan.dialogue_min_before_split as u32;
            let min_after = orphan.dialogue_min_after_split as u32;

            // Account for space_before in what's available
            let available_for_content = remaining.saturating_sub(lines.space_before as u32);

            // Need room for at least min_before lines
            if available_for_content >= min_before {
                let remaining_after_split = lines.content_lines.saturating_sub(available_for_content);

                // Check if remainder is enough for min_after
                if remaining_after_split >= min_after {
                    // We can split at available_for_content lines
                    // But reserve 1 line for MORE marker
                    let split_line = available_for_content.saturating_sub(1);
                    if split_line >= min_before {
                        return BreakDecision::SplitAt { line: split_line };
                    }
                }
            }

            // Can't split properly, push to next page
            BreakDecision::BreakBefore
        }

        // Action: can split without continuation markers
        ElementType::Action => {
            if !style.can_split {
                return BreakDecision::BreakBefore;
            }

            let min_before = style.min_lines_before_split as u32;
            let min_after = style.min_lines_after_split as u32;

            let available_for_content = remaining.saturating_sub(lines.space_before as u32);

            if available_for_content >= min_before {
                let remaining_after_split = lines.content_lines.saturating_sub(available_for_content);

                if remaining_after_split >= min_after {
                    return BreakDecision::SplitAt { line: available_for_content };
                }
            }

            BreakDecision::BreakBefore
        }

        // Transition: never split
        ElementType::Transition => {
            BreakDecision::BreakBefore
        }

        // Act break: always on new page
        ElementType::ActBreak => {
            BreakDecision::BreakBefore
        }

        // Default: push to next page
        _ => BreakDecision::BreakBefore,
    }
}

/// Estimate lines needed for the next N elements
fn estimate_following_lines(config: &PageConfig, upcoming: &[Element], count: u8) -> u32 {
    let calc = LineCalculator::new(config);
    let mut total = 0u32;

    for (i, element) in upcoming.iter().take(count as usize).enumerate() {
        let lines = calc.calculate(element);
        // First following element doesn't need space_before (it follows immediately)
        if i == 0 {
            total += lines.content_lines;
        } else {
            total += lines.space_before as u32 + lines.content_lines;
        }
    }

    total
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_element(id: &str, element_type: ElementType, content: &str) -> Element {
        Element::new(id, element_type, content)
    }

    fn make_dialogue(id: &str, content: &str, character: &str) -> Element {
        Element::new(id, ElementType::Dialogue, content)
            .with_character_name(character)
    }

    #[test]
    fn test_basic_pagination() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::Character, "SARAH"),
            make_dialogue("4", "Hello, is anyone there?", "SARAH"),
        ];

        let result = paginate(&elements, &config);

        assert_eq!(result.stats.page_count, 1);
        assert!(result.warnings.is_empty());
        assert_eq!(result.element_positions.len(), 4);
    }

    #[test]
    fn test_page_break_element() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Action, "First page content."),
            make_element("2", ElementType::PageBreak, ""),
            make_element("3", ElementType::Action, "Second page content."),
        ];

        let result = paginate(&elements, &config);

        assert_eq!(result.stats.page_count, 2);
    }

    #[test]
    fn test_scene_heading_orphan_prevention() {
        let config = PageConfig::feature_film();

        // Fill a page almost completely
        let long_action = "Action text. ".repeat(100);
        let elements = vec![
            make_element("1", ElementType::Action, &long_action),
            make_element("2", ElementType::SceneHeading, "INT. NEW LOCATION - NIGHT"),
            make_element("3", ElementType::Action, "New scene content."),
        ];

        let result = paginate(&elements, &config);

        // Scene heading should have content following it on same page
        let heading_pos = result.element_positions.get("2").unwrap();
        let action_pos = result.element_positions.get("3").unwrap();

        assert_eq!(heading_pos.pages[0], action_pos.pages[0]);
    }

    #[test]
    fn test_determinism() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = (0..50)
            .map(|i| make_element(&i.to_string(), ElementType::Action, "Some action text here."))
            .collect();

        let result1 = paginate(&elements, &config);
        let result2 = paginate(&elements, &config);

        assert_eq!(result1.stats.page_count, result2.stats.page_count);
        assert_eq!(result1.pages.len(), result2.pages.len());
    }

    #[test]
    fn test_empty_document() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = vec![];

        let result = paginate(&elements, &config);

        assert_eq!(result.stats.page_count, 0);
        assert!(result.pages.is_empty());
    }

    #[test]
    fn test_timing_recorded() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Action, "Some content."),
        ];

        let result = paginate(&elements, &config);

        // Timing is measured by JavaScript worker, Rust returns 0
        // Just verify pagination completed without errors
        assert!(!result.pages.is_empty());
    }

    #[test]
    fn test_is_glue_pair_character_dialogue() {
        let char_elem = make_element("1", ElementType::Character, "SARAH");
        let dial_elem = make_element("2", ElementType::Dialogue, "Hello there.");

        assert!(is_glue_pair(&char_elem, &dial_elem));
    }

    #[test]
    fn test_is_glue_pair_character_parenthetical() {
        let char_elem = make_element("1", ElementType::Character, "SARAH");
        let paren_elem = make_element("2", ElementType::Parenthetical, "(sadly)");

        assert!(is_glue_pair(&char_elem, &paren_elem));
    }

    #[test]
    fn test_is_glue_pair_parenthetical_dialogue() {
        let paren_elem = make_element("1", ElementType::Parenthetical, "(sadly)");
        let dial_elem = make_element("2", ElementType::Dialogue, "Hello there.");

        assert!(is_glue_pair(&paren_elem, &dial_elem));
    }

    #[test]
    fn test_is_glue_pair_action_dialogue_false() {
        let action_elem = make_element("1", ElementType::Action, "She walks in.");
        let dial_elem = make_element("2", ElementType::Dialogue, "Hello there.");

        assert!(!is_glue_pair(&action_elem, &dial_elem));
    }

    #[test]
    fn test_glue_group_character_dialogue() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Character, "SARAH"),
            make_element("2", ElementType::Dialogue, "Hello there."),
            make_element("3", ElementType::Action, "She exits."),
        ];

        let (cost, end_idx) = calculate_glue_group_cost(&elements, 0, &config, 0);

        // Should include CHARACTER + DIALOGUE but not ACTION
        assert_eq!(end_idx, 2);
        assert!(cost > 0);
    }

    #[test]
    fn test_glue_group_character_parenthetical_dialogue() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Character, "SARAH"),
            make_element("2", ElementType::Parenthetical, "(sadly)"),
            make_element("3", ElementType::Dialogue, "Goodbye."),
            make_element("4", ElementType::Action, "She exits."),
        ];

        let (cost, end_idx) = calculate_glue_group_cost(&elements, 0, &config, 0);

        // Should include CHARACTER + PARENTHETICAL + DIALOGUE but not ACTION
        assert_eq!(end_idx, 3);
        assert!(cost > 0);
    }

    #[test]
    fn test_glue_group_keeps_together_on_page_break() {
        let config = PageConfig::feature_film();

        // Fill page almost completely (52 lines per page)
        // Each action line with 1 space before = 2 lines, need ~25 actions to fill
        let mut elements: Vec<Element> = (0..24)
            .map(|i| make_element(&format!("a{}", i), ElementType::Action, "Action text here."))
            .collect();

        // Add a CHARACTER + DIALOGUE pair that should go to the next page as a unit
        elements.push(make_element("char", ElementType::Character, "SARAH"));
        elements.push(make_dialogue("dial", "Hello, this is dialogue.", "SARAH"));

        let result = paginate(&elements, &config);

        // CHARACTER and DIALOGUE should be on the same page
        let char_pos = result.element_positions.get("char").unwrap();
        let dial_pos = result.element_positions.get("dial").unwrap();

        assert_eq!(char_pos.pages[0], dial_pos.pages[0],
            "CHARACTER and DIALOGUE should be on the same page due to glue logic");
    }
}
