//! Glue pair logic for keeping related screenplay elements together.
//!
//! In screenplay formatting, certain element pairs must stay together on the
//! same page. For example, a CHARACTER name must stay with its following
//! DIALOGUE or PARENTHETICAL. This module implements the "glue" logic that
//! determines which elements form inseparable groups.

use crate::types::{Element, ElementType, PageConfig};
use super::LineCalculator;

/// Check if two elements form a "glue pair" that must stay together.
///
/// Glue pairs are element combinations that should never be split across pages:
/// - CHARACTER + DIALOGUE: The character name and their speech
/// - CHARACTER + PARENTHETICAL: The character name and stage direction
/// - PARENTHETICAL + DIALOGUE: Stage direction and the speech that follows
///
/// This matches the JavaScript implementation:
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
///
/// # Examples
///
/// ```
/// use verso_pagination_engine::types::{Element, ElementType};
/// use verso_pagination_engine::layout::is_glue_pair;
///
/// let character = Element::new("1", ElementType::Character, "SARAH");
/// let dialogue = Element::new("2", ElementType::Dialogue, "Hello!");
/// assert!(is_glue_pair(&character, &dialogue));
///
/// let action = Element::new("3", ElementType::Action, "She walks in.");
/// assert!(!is_glue_pair(&action, &dialogue));
/// ```
pub fn is_glue_pair(first: &Element, second: &Element) -> bool {
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
///
/// A glue group is a chain of elements that must stay together:
/// - CHARACTER + DIALOGUE
/// - CHARACTER + PARENTHETICAL + DIALOGUE
/// - PARENTHETICAL + DIALOGUE
///
/// The function walks forward from `start_idx` collecting all glued elements
/// and returns the total line cost including space-before margins.
///
/// # Arguments
///
/// * `elements` - Slice of all elements being paginated
/// * `start_idx` - Index of the first element in the potential glue group
/// * `config` - Page configuration for line calculations
/// * `current_y` - Current line position on the page (0 = page start)
///
/// # Returns
///
/// A tuple of `(group_cost, group_end_index)` where:
/// - `group_cost` is the total lines required for the group
/// - `group_end_index` is the exclusive end index of the group
///
/// # Example
///
/// ```
/// use verso_pagination_engine::types::{Element, ElementType, PageConfig};
/// use verso_pagination_engine::layout::calculate_glue_group_cost;
///
/// let config = PageConfig::feature_film();
/// let elements = vec![
///     Element::new("1", ElementType::Character, "SARAH"),
///     Element::new("2", ElementType::Dialogue, "Hello there."),
///     Element::new("3", ElementType::Action, "She exits."),
/// ];
///
/// let (cost, end_idx) = calculate_glue_group_cost(&elements, 0, &config, 0);
/// assert_eq!(end_idx, 2); // Includes CHARACTER + DIALOGUE but not ACTION
/// assert!(cost > 0);
/// ```
pub fn calculate_glue_group_cost(
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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_element(id: &str, element_type: ElementType, content: &str) -> Element {
        Element::new(id, element_type, content)
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
    fn test_glue_group_single_element() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Action, "She walks in."),
            make_element("2", ElementType::Action, "She sits down."),
        ];

        let (cost, end_idx) = calculate_glue_group_cost(&elements, 0, &config, 0);

        // Action doesn't glue to anything, so group is just the first element
        assert_eq!(end_idx, 1);
        assert!(cost > 0);
    }

    #[test]
    fn test_glue_group_at_end_of_elements() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Character, "SARAH"),
            make_element("2", ElementType::Dialogue, "Hello."),
        ];

        let (cost, end_idx) = calculate_glue_group_cost(&elements, 0, &config, 0);

        // Should include both elements (at end of list)
        assert_eq!(end_idx, 2);
        assert!(cost > 0);
    }

    #[test]
    fn test_glue_group_with_margin() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::Character, "SARAH"),
            make_element("2", ElementType::Dialogue, "Hello."),
        ];

        // At page start (current_y = 0), no margin for first element
        let (cost_at_start, _) = calculate_glue_group_cost(&elements, 0, &config, 0);

        // Mid-page (current_y > 0), includes margin for first element
        let (cost_mid_page, _) = calculate_glue_group_cost(&elements, 0, &config, 10);

        // Cost should be higher mid-page due to space_before
        assert!(cost_mid_page >= cost_at_start);
    }
}
