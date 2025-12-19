//! Dual Dialogue Layout Module
//!
//! Handles the detection and line calculation for dual dialogue blocks,
//! where two characters speak simultaneously side by side.
//!
//! # Dual Dialogue Structure
//!
//! A dual dialogue group consists of:
//! - Left column elements (marked with `dual_dialogue_position: Some(Left)`)
//! - Right column elements (marked with `dual_dialogue_position: Some(Right)`)
//!
//! The group is treated as an atomic unit for page breaking - it cannot be
//! split across pages (for now). If it doesn't fit, the entire block moves
//! to the next page.

use crate::types::{DualDialoguePosition, Element, PageConfig};

/// Default character width for dual dialogue columns.
/// Each column is roughly half the normal dialogue width.
/// Normal dialogue: 35 chars, dual column: ~17 chars
pub const DUAL_DIALOGUE_COLUMN_WIDTH: u8 = 17;

/// A group of elements that form a dual dialogue block.
///
/// Dual dialogue blocks are consecutive elements where elements are marked
/// with `dual_dialogue_position` of either `Left` or `Right`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DualDialogueGroup {
    /// Starting index in the elements array (inclusive)
    pub start_idx: usize,

    /// Ending index in the elements array (exclusive)
    pub end_idx: usize,

    /// Indices of elements in the left column
    pub left_elements: Vec<usize>,

    /// Indices of elements in the right column
    pub right_elements: Vec<usize>,

    /// Total line height of the group (max of left and right column heights)
    pub total_lines: u32,
}

impl DualDialogueGroup {
    /// Create a new empty dual dialogue group starting at the given index
    pub fn new(start_idx: usize) -> Self {
        Self {
            start_idx,
            end_idx: start_idx,
            left_elements: Vec::new(),
            right_elements: Vec::new(),
            total_lines: 0,
        }
    }

    /// Check if the group is empty (no elements)
    pub fn is_empty(&self) -> bool {
        self.left_elements.is_empty() && self.right_elements.is_empty()
    }

    /// Get the number of elements in this group
    pub fn element_count(&self) -> usize {
        self.left_elements.len() + self.right_elements.len()
    }
}

/// Find all dual dialogue groups in a slice of elements.
///
/// A dual dialogue group starts when we encounter an element with
/// `dual_dialogue_position` set, and ends when we encounter an element
/// without it set (or reach the end of the slice).
///
/// # Returns
///
/// A vector of `DualDialogueGroup` structs, each describing a contiguous
/// block of dual dialogue elements with their calculated line heights.
pub fn find_dual_dialogue_groups(elements: &[Element], config: &PageConfig) -> Vec<DualDialogueGroup> {
    let mut groups = Vec::new();
    let mut current_group: Option<DualDialogueGroup> = None;

    for (idx, element) in elements.iter().enumerate() {
        match element.dual_dialogue_position {
            Some(position) => {
                // Start a new group if we don't have one
                let group = current_group.get_or_insert_with(|| DualDialogueGroup::new(idx));

                // Add element to appropriate column
                match position {
                    DualDialoguePosition::Left => {
                        group.left_elements.push(idx);
                    }
                    DualDialoguePosition::Right => {
                        group.right_elements.push(idx);
                    }
                }

                // Update end index
                group.end_idx = idx + 1;
            }
            None => {
                // End current group if we have one
                if let Some(mut group) = current_group.take() {
                    if !group.is_empty() {
                        // Calculate the total lines for this group
                        group.total_lines = calculate_dual_group_lines(elements, &group, config);
                        groups.push(group);
                    }
                }
            }
        }
    }

    // Don't forget the last group if document ends with dual dialogue
    if let Some(mut group) = current_group {
        if !group.is_empty() {
            group.total_lines = calculate_dual_group_lines(elements, &group, config);
            groups.push(group);
        }
    }

    groups
}

/// Calculate the total line height for a dual dialogue group.
///
/// The height is the maximum of the left and right column heights.
/// Each column's height is the sum of its elements' line counts when
/// wrapped to the narrower dual dialogue column width.
///
/// # Arguments
///
/// * `elements` - The full elements array
/// * `group` - The dual dialogue group to calculate
/// * `config` - Page configuration for style lookup
///
/// # Returns
///
/// The total lines needed for this dual dialogue block
pub fn calculate_dual_group_lines(
    elements: &[Element],
    group: &DualDialogueGroup,
    config: &PageConfig,
) -> u32 {
    let dual_width = get_dual_column_width(config);

    let left_lines = calculate_column_lines(elements, &group.left_elements, config, dual_width);
    let right_lines = calculate_column_lines(elements, &group.right_elements, config, dual_width);

    // The group height is the max of both columns
    left_lines.max(right_lines)
}

/// Calculate the total lines for a single column of dual dialogue.
///
/// This sums up all the lines for each element in the column,
/// including space_before for elements after the first.
fn calculate_column_lines(
    elements: &[Element],
    indices: &[usize],
    config: &PageConfig,
    column_width: u8,
) -> u32 {
    if indices.is_empty() {
        return 0;
    }

    let mut total_lines = 0u32;

    for (i, &idx) in indices.iter().enumerate() {
        let element = &elements[idx];
        let lines = calculate_element_dual_lines(element, config, column_width);

        // First element in column doesn't get space_before
        // (space_before is handled by the group as a whole)
        if i > 0 {
            let style = config.style_for(element.element_type);
            total_lines += style.space_before as u32;
        }

        total_lines += lines;
    }

    total_lines
}

/// Calculate lines for a single element when rendered in dual dialogue column width.
///
/// This uses a narrower column width than normal dialogue to account for
/// side-by-side layout.
fn calculate_element_dual_lines(element: &Element, config: &PageConfig, column_width: u8) -> u32 {
    // Strip HTML and calculate wrapped lines
    let stripped_content = strip_html(&element.content);

    if stripped_content.is_empty() {
        return 1; // Empty content still takes 1 line
    }

    let wrapped_lines = wrap_text(&stripped_content, column_width as usize);
    let content_lines = if wrapped_lines.is_empty() { 1 } else { wrapped_lines.len() as u32 };

    // Apply line spacing (for multi-cam double-spaced dialogue)
    let style = config.style_for(element.element_type);
    if style.line_spacing > 1.0 {
        ((content_lines as f64) * style.line_spacing).ceil() as u32
    } else {
        content_lines
    }
}

/// Get the dual dialogue column width from config.
///
/// Uses the dual_dialogue_column_width from config if set,
/// otherwise falls back to the default.
pub fn get_dual_column_width(config: &PageConfig) -> u8 {
    config.dual_dialogue_column_width.unwrap_or(DUAL_DIALOGUE_COLUMN_WIDTH)
}

/// Strip HTML tags from content for accurate line measurement.
/// Matches the implementation in line_calculator.rs.
fn strip_html(html: &str) -> String {
    if html.is_empty() {
        return String::new();
    }

    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;

    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(ch),
            _ => {}
        }
    }

    result
}

/// Word wrap text to fit within character limit.
/// Simplified version matching line_calculator.rs logic.
fn wrap_text(text: &str, chars_per_line: usize) -> Vec<String> {
    if chars_per_line == 0 {
        return vec![text.to_string()];
    }

    let mut lines = Vec::new();

    for paragraph in text.split('\n') {
        if paragraph.is_empty() {
            lines.push(String::new());
            continue;
        }

        let words: Vec<&str> = paragraph.split_whitespace().collect();
        if words.is_empty() {
            lines.push(String::new());
            continue;
        }

        let mut current_line = String::new();

        for word in words {
            let word_chars = word.chars().count();
            let line_chars = current_line.chars().count();

            if current_line.is_empty() {
                if word_chars > chars_per_line {
                    // Word is longer than line - force break
                    let mut remaining = word;
                    while remaining.chars().count() > chars_per_line {
                        let split_pos = remaining
                            .char_indices()
                            .nth(chars_per_line)
                            .map(|(i, _)| i)
                            .unwrap_or(remaining.len());
                        lines.push(remaining[..split_pos].to_string());
                        remaining = &remaining[split_pos..];
                    }
                    if !remaining.is_empty() {
                        current_line = remaining.to_string();
                    }
                } else {
                    current_line = word.to_string();
                }
            } else if line_chars + 1 + word_chars <= chars_per_line {
                // Word fits on current line
                current_line.push(' ');
                current_line.push_str(word);
            } else {
                // Word doesn't fit - start new line
                lines.push(current_line);

                if word_chars > chars_per_line {
                    let mut remaining = word;
                    while remaining.chars().count() > chars_per_line {
                        let split_pos = remaining
                            .char_indices()
                            .nth(chars_per_line)
                            .map(|(i, _)| i)
                            .unwrap_or(remaining.len());
                        lines.push(remaining[..split_pos].to_string());
                        remaining = &remaining[split_pos..];
                    }
                    current_line = if remaining.is_empty() {
                        String::new()
                    } else {
                        remaining.to_string()
                    };
                } else {
                    current_line = word.to_string();
                }
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }
    }

    if lines.is_empty() && !text.is_empty() {
        lines.push(String::new());
    }

    lines
}

/// Check if an element is part of a dual dialogue block.
pub fn is_dual_dialogue_element(element: &Element) -> bool {
    element.dual_dialogue_position.is_some()
}

/// Get the space_before for a dual dialogue group.
///
/// Uses the space_before of the first element's type in the group,
/// typically a Character element.
pub fn get_dual_group_space_before(elements: &[Element], group: &DualDialogueGroup, config: &PageConfig) -> u8 {
    // Get the first element in the group (by index)
    let first_idx = group.start_idx;
    if first_idx < elements.len() {
        let style = config.style_for(elements[first_idx].element_type);
        return style.space_before;
    }
    1 // Default space before
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Element, ElementId, ElementType, DualDialoguePosition};

    fn make_element(id: &str, element_type: ElementType, content: &str) -> Element {
        Element {
            id: ElementId::new(id),
            element_type,
            content: content.to_string(),
            character_name: None,
            dual_dialogue_position: None,
            force_page_break_after: false,
            auto_contd: false,
            scene_number: None,
        }
    }

    fn make_dual_element(
        id: &str,
        element_type: ElementType,
        content: &str,
        position: DualDialoguePosition,
    ) -> Element {
        Element {
            id: ElementId::new(id),
            element_type,
            content: content.to_string(),
            character_name: if element_type == ElementType::Character {
                Some(content.to_uppercase())
            } else {
                None
            },
            dual_dialogue_position: Some(position),
            force_page_break_after: false,
            auto_contd: false,
            scene_number: None,
        }
    }

    #[test]
    fn test_find_no_dual_dialogue() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "People talking."),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);
        assert!(groups.is_empty());
    }

    #[test]
    fn test_find_single_dual_dialogue_group() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("3", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
            make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("5", ElementType::Dialogue, "Hi there!", DualDialoguePosition::Right),
            make_element("6", ElementType::Action, "They shake hands."),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);

        assert_eq!(groups.len(), 1);
        let group = &groups[0];
        assert_eq!(group.start_idx, 1);
        assert_eq!(group.end_idx, 5);
        assert_eq!(group.left_elements, vec![1, 2]);
        assert_eq!(group.right_elements, vec![3, 4]);
    }

    #[test]
    fn test_find_multiple_dual_dialogue_groups() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            // First dual dialogue group
            make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("3", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
            make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("5", ElementType::Dialogue, "Hi!", DualDialoguePosition::Right),
            // Regular content
            make_element("6", ElementType::Action, "They pause."),
            // Second dual dialogue group
            make_dual_element("7", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("8", ElementType::Dialogue, "Bye!", DualDialoguePosition::Left),
            make_dual_element("9", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("10", ElementType::Dialogue, "See ya!", DualDialoguePosition::Right),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);

        assert_eq!(groups.len(), 2);

        assert_eq!(groups[0].start_idx, 1);
        assert_eq!(groups[0].end_idx, 5);

        assert_eq!(groups[1].start_idx, 6);
        assert_eq!(groups[1].end_idx, 10);
    }

    #[test]
    fn test_dual_dialogue_at_end_of_document() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("3", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
            make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("5", ElementType::Dialogue, "Hi!", DualDialoguePosition::Right),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].end_idx, 5);
    }

    #[test]
    fn test_calculate_dual_group_lines_balanced() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_dual_element("1", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("2", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
            make_dual_element("3", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("4", ElementType::Dialogue, "Hi!", DualDialoguePosition::Right),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);
        assert_eq!(groups.len(), 1);

        let group = &groups[0];
        // Both columns: CHARACTER (1 line) + DIALOGUE (1 line) = 2 lines each
        // Max = 2
        assert!(group.total_lines >= 2);
    }

    #[test]
    fn test_calculate_dual_group_lines_unbalanced() {
        let config = PageConfig::feature_film();

        // Right column has longer dialogue that will wrap
        let long_dialogue = "This is a much longer line of dialogue that should definitely wrap to multiple lines in the narrower dual dialogue column width.";

        let elements = vec![
            make_dual_element("1", ElementType::Character, "JOHN", DualDialoguePosition::Left),
            make_dual_element("2", ElementType::Dialogue, "Short.", DualDialoguePosition::Left),
            make_dual_element("3", ElementType::Character, "JANE", DualDialoguePosition::Right),
            make_dual_element("4", ElementType::Dialogue, long_dialogue, DualDialoguePosition::Right),
        ];

        let groups = find_dual_dialogue_groups(&elements, &config);
        assert_eq!(groups.len(), 1);

        let group = &groups[0];
        // Right column should be taller due to long dialogue wrapping
        assert!(group.total_lines > 2, "Expected more than 2 lines due to wrapping");
    }

    #[test]
    fn test_wrap_text_narrow_column() {
        let text = "This is a test of word wrapping for dual dialogue.";
        let wrapped = wrap_text(text, 17);

        // Should wrap to multiple lines at 17 chars
        assert!(wrapped.len() > 1, "Expected multiple lines, got {}", wrapped.len());

        // Each line should be <= 17 chars (except possibly split words)
        for line in &wrapped {
            // Allow some overflow for words that can't be split
            assert!(line.chars().count() <= 20, "Line too long: '{}'", line);
        }
    }

    #[test]
    fn test_strip_html() {
        assert_eq!(strip_html("<b>Hello</b> world"), "Hello world");
        assert_eq!(strip_html("No tags here"), "No tags here");
        assert_eq!(strip_html("<i><b>Nested</b></i>"), "Nested");
        assert_eq!(strip_html(""), "");
    }

    #[test]
    fn test_is_dual_dialogue_element() {
        let regular = make_element("1", ElementType::Dialogue, "Hello");
        let dual_left = make_dual_element("2", ElementType::Dialogue, "Hello", DualDialoguePosition::Left);
        let dual_right = make_dual_element("3", ElementType::Dialogue, "Hi", DualDialoguePosition::Right);

        assert!(!is_dual_dialogue_element(&regular));
        assert!(is_dual_dialogue_element(&dual_left));
        assert!(is_dual_dialogue_element(&dual_right));
    }

    #[test]
    fn test_get_dual_column_width() {
        let config = PageConfig::feature_film();
        let width = get_dual_column_width(&config);

        // Should use default since config doesn't have it set
        assert_eq!(width, DUAL_DIALOGUE_COLUMN_WIDTH);
    }

    #[test]
    fn test_empty_group() {
        let group = DualDialogueGroup::new(0);
        assert!(group.is_empty());
        assert_eq!(group.element_count(), 0);
    }
}
