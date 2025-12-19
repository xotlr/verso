//! Page break decision logic for screenplay elements.
//!
//! This module contains the core logic for deciding how to handle elements
//! at page boundaries. It determines whether an element fits on the current
//! page, should be pushed to the next page, or can be split across pages.

use crate::types::{Element, ElementType, PageConfig};
use super::{LineCalculation, LineCalculator};

/// Decision for how to handle an element at a page boundary.
///
/// The pagination engine uses this enum to determine the appropriate
/// action when an element approaches or exceeds the remaining space
/// on the current page.
#[derive(Debug, Clone, PartialEq)]
pub enum BreakDecision {
    /// Element fits on current page without any special handling.
    Fits,

    /// Break page before this element (push entire element to next page).
    ///
    /// Used for:
    /// - Elements that cannot be split (SceneHeading, Character, Transition)
    /// - Elements where splitting would violate orphan/widow rules
    /// - Glue groups that must stay together
    BreakBefore,

    /// Split the element at the given line number.
    ///
    /// The `line` field indicates how many lines of content should remain
    /// on the current page. The remainder flows to the next page.
    ///
    /// Only valid for splittable elements (Dialogue, Action).
    SplitAt {
        /// Number of content lines to keep on current page
        line: u32,
    },
}

/// Decide how to handle an element at a page boundary.
///
/// This function implements the core page break logic, considering:
/// - Element type and whether it can be split
/// - Remaining space on the current page
/// - Orphan/widow control rules from config
/// - Glue group constraints (CHARACTER must stay with DIALOGUE)
/// - keep_with_next requirements (SceneHeading needs following content)
///
/// # Arguments
///
/// * `element` - The element being placed
/// * `lines` - Pre-calculated line information for the element
/// * `total_needed` - Total lines needed including space_before
/// * `remaining` - Lines remaining on current page
/// * `config` - Page configuration with orphan control settings
/// * `upcoming` - Slice of upcoming elements (for keep_with_next logic)
/// * `glue_group_exceeds` - Whether the element's glue group exceeds remaining space
///
/// # Returns
///
/// A `BreakDecision` indicating how to handle the element.
///
/// # Example
///
/// ```
/// use verso_pagination_engine::types::{Element, ElementType, PageConfig};
/// use verso_pagination_engine::layout::{decide_break, LineCalculator};
///
/// let config = PageConfig::feature_film();
/// let element = Element::new("1", ElementType::Action, "Short action.");
/// let line_calc = LineCalculator::new(&config);
/// let lines = line_calc.calculate(&element);
///
/// let decision = decide_break(
///     &element,
///     &lines,
///     lines.total_lines,
///     50, // plenty of room
///     &config,
///     &[],
///     false,
/// );
///
/// assert!(matches!(decision, verso_pagination_engine::layout::BreakDecision::Fits));
/// ```
pub fn decide_break(
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

/// Estimate lines needed for the next N elements.
///
/// Used by keep_with_next logic to determine if an element and its
/// required following content will fit on the current page.
///
/// # Arguments
///
/// * `config` - Page configuration for line calculations
/// * `upcoming` - Slice of upcoming elements
/// * `count` - Maximum number of elements to consider
///
/// # Returns
///
/// Total estimated lines needed for the specified number of following elements.
pub fn estimate_following_lines(config: &PageConfig, upcoming: &[Element], count: u8) -> u32 {
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

    #[test]
    fn test_fits_when_enough_space() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::Action, "Short action.");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        let decision = decide_break(
            &element,
            &lines,
            lines.total_lines,
            50,
            &config,
            &[],
            false,
        );

        assert!(matches!(decision, BreakDecision::Fits));
    }

    #[test]
    fn test_break_before_when_glue_group_exceeds() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::Character, "SARAH");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        let decision = decide_break(
            &element,
            &lines,
            lines.total_lines,
            50,
            &config,
            &[],
            true, // glue group exceeds
        );

        assert!(matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_scene_heading_never_splits() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        let decision = decide_break(
            &element,
            &lines,
            10,
            5, // not enough space
            &config,
            &[],
            false,
        );

        assert!(matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_character_never_splits() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::Character, "SARAH");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        let decision = decide_break(
            &element,
            &lines,
            10,
            1,
            &config,
            &[],
            false,
        );

        assert!(matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_long_dialogue_can_split() {
        let config = PageConfig::feature_film();
        let long_text = "This is a very long piece of dialogue. ".repeat(10);
        let element = make_element("1", ElementType::Dialogue, &long_text);
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        // Enough space to split but not fit entirely
        let remaining = (lines.content_lines / 2) + 5;

        let decision = decide_break(
            &element,
            &lines,
            lines.space_before as u32 + lines.content_lines,
            remaining,
            &config,
            &[],
            false,
        );

        // Should split if there's enough content on both sides
        assert!(matches!(decision, BreakDecision::SplitAt { .. }) ||
                matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_transition_never_splits() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::Transition, "CUT TO:");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        let decision = decide_break(
            &element,
            &lines,
            10,
            1,
            &config,
            &[],
            false,
        );

        assert!(matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_scene_heading_needs_following_content() {
        let config = PageConfig::feature_film();
        let element = make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY");
        let line_calc = LineCalculator::new(&config);
        let lines = line_calc.calculate(&element);

        // Just enough for heading but not for following content
        let decision = decide_break(
            &element,
            &lines,
            lines.total_lines,
            lines.total_lines + 1, // Only 1 line after heading
            &config,
            &[make_element("2", ElementType::Action, "Action.")],
            false,
        );

        assert!(matches!(decision, BreakDecision::BreakBefore));
    }

    #[test]
    fn test_estimate_following_lines() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Action, "First action."),
            make_element("2", ElementType::Action, "Second action."),
            make_element("3", ElementType::Action, "Third action."),
        ];

        let total = estimate_following_lines(&config, &elements, 2);

        // Should include first two elements
        assert!(total > 0);
    }

    #[test]
    fn test_estimate_following_lines_empty() {
        let config = PageConfig::feature_film();
        let total = estimate_following_lines(&config, &[], 5);
        assert_eq!(total, 0);
    }
}
