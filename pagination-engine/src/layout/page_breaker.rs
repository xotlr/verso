use std::collections::HashMap;
use std::time::Instant;

use crate::types::{
    Element, ElementId, ElementPosition, ElementType, Page,
    PageBreakReason, PageConfig, PageElement, PageIdentifier, PaginationResult,
    PaginationStats, PaginationWarning, WarningType, LineRange,
};
use super::{ContinuationManager, LineCalculation, LineCalculator};

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
}

impl PaginationState {
    fn new() -> Self {
        Self {
            pages: Vec::new(),
            current_page: Page::new(PageIdentifier::Sequential(1)),
            page_number: 1,
            element_positions: HashMap::new(),
            warnings: Vec::new(),
            break_count: 0,
            continuation_count: 0,
        }
    }

    fn lines_remaining(&self, lines_per_page: u8) -> u8 {
        lines_per_page.saturating_sub(self.current_page.lines_used)
    }

    fn at_page_start(&self) -> bool {
        self.current_page.lines_used == 0
    }

    fn end_page(&mut self, _reason: PageBreakReason) {
        let finished_page = std::mem::replace(
            &mut self.current_page,
            Page::new(PageIdentifier::Sequential(self.page_number + 1)),
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
            self.pages.push(self.current_page);
        }

        let page_count = self.pages.len() as u32;

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
            },
        }
    }
}

/// Core pagination function - pure, deterministic, no side effects
pub fn paginate(elements: &[Element], config: &PageConfig) -> PaginationResult {
    let start = Instant::now();

    let line_calc = LineCalculator::new(config);
    let continuation_mgr = ContinuationManager::new(config);

    let mut state = PaginationState::new();
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

        // Calculate total space needed
        let space_before = if state.at_page_start() { 0 } else { lines.space_before };
        let total_needed = space_before as u32 + lines.total_lines;

        let remaining = state.lines_remaining(config.lines_per_page) as u32;

        // Decide what to do
        let decision = decide_break(
            element,
            &lines,
            total_needed,
            remaining,
            config,
            &elements[idx..],
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

    let timing = start.elapsed().as_micros() as u64;
    state.finalize(timing, element_count)
}

/// Decide how to handle an element at a page boundary
fn decide_break(
    element: &Element,
    lines: &LineCalculation,
    total_needed: u32,
    remaining: u32,
    config: &PageConfig,
    upcoming: &[Element],
) -> BreakDecision {
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

        // Timing should be recorded (can't assert exact value)
        assert!(result.stats.timing_us >= 0);
    }
}
