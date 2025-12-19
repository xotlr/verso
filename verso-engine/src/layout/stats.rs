//! Document statistics calculation module.
//!
//! This module provides functionality to analyze screenplay documents and
//! calculate useful statistics like scene counts, dialogue distribution,
//! and estimated runtime.

use std::collections::HashMap;

use crate::types::{DocumentStats, Element, ElementType, PageConfig};
use super::LineCalculator;

/// Calculate document-level statistics from the screenplay elements.
///
/// This is a pure function that analyzes the document without modifying it.
/// Statistics include:
/// - Scene count (number of SceneHeading elements)
/// - Dialogue block count (CHARACTER + DIALOGUE pairs)
/// - Speaking characters (unique character names with dialogue)
/// - Dialogue lines per character
/// - Action vs dialogue ratio
///
/// # Arguments
///
/// * `elements` - The screenplay elements to analyze
/// * `page_count` - The total page count (from pagination)
/// * `config` - The page configuration (for line calculations)
///
/// # Returns
///
/// A `DocumentStats` struct containing the calculated statistics
pub fn calculate_document_stats(
    elements: &[Element],
    page_count: u32,
    config: &PageConfig,
) -> DocumentStats {
    let line_calc = LineCalculator::new(config);

    let mut scene_count = 0u32;
    let mut dialogue_block_count = 0u32;
    let mut character_dialogue_lines: HashMap<String, u32> = HashMap::new();
    let mut action_lines = 0u32;
    let mut dialogue_lines = 0u32;

    // Track the current character for dialogue attribution
    let mut current_character: Option<String> = None;

    for element in elements {
        match element.element_type {
            ElementType::SceneHeading => {
                scene_count += 1;
                current_character = None;
            }

            ElementType::Character => {
                // Extract character name (use character_name field if set, otherwise content)
                let name = element.character_name
                    .clone()
                    .unwrap_or_else(|| normalize_character_name(&element.content));
                current_character = Some(name);
            }

            ElementType::Dialogue => {
                // Count dialogue lines
                let lines = line_calc.calculate(element);
                let line_count = lines.content_lines;
                dialogue_lines += line_count;

                // Attribute to current character
                if let Some(ref char_name) = current_character {
                    *character_dialogue_lines.entry(char_name.clone()).or_insert(0) += line_count;
                    dialogue_block_count += 1;
                }
            }

            ElementType::Parenthetical => {
                // Parentheticals are part of dialogue blocks but don't reset character
                let lines = line_calc.calculate(element);
                dialogue_lines += lines.content_lines;
            }

            ElementType::Action => {
                // Count action lines
                let lines = line_calc.calculate(element);
                action_lines += lines.content_lines;
                current_character = None;
            }

            // Other element types reset the current character
            ElementType::Transition
            | ElementType::Shot
            | ElementType::ActBreak
            | ElementType::PageBreak => {
                current_character = None;
            }

            // Elements that don't affect character tracking or stats
            _ => {}
        }
    }

    // Build sorted list of speaking characters
    let mut speaking_characters: Vec<String> = character_dialogue_lines.keys().cloned().collect();
    speaking_characters.sort();

    // Calculate action/dialogue ratio
    let total_content_lines = action_lines + dialogue_lines;
    let action_dialogue_ratio = if total_content_lines > 0 {
        action_lines as f32 / total_content_lines as f32
    } else {
        0.5 // Default to balanced if no content
    };

    // Estimated runtime: 1 page ≈ 1 minute (industry standard)
    let estimated_runtime_minutes = page_count as f32;

    DocumentStats {
        page_count,
        estimated_runtime_minutes,
        scene_count,
        dialogue_block_count,
        speaking_characters,
        character_dialogue_lines,
        action_dialogue_ratio,
    }
}

/// Normalize a character name by removing common suffixes and extensions.
///
/// This handles cases like:
/// - "JOHN (V.O.)" -> "JOHN"
/// - "JOHN (O.S.)" -> "JOHN"
/// - "JOHN (CONT'D)" -> "JOHN"
/// - "JOHN (O.C.)" -> "JOHN"
fn normalize_character_name(name: &str) -> String {
    // Remove parenthetical suffixes like (V.O.), (O.S.), (CONT'D), etc.
    let name = name.trim();

    // Find the first opening parenthesis and truncate there
    if let Some(paren_pos) = name.find('(') {
        name[..paren_pos].trim().to_uppercase()
    } else {
        name.to_uppercase()
    }
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
    fn test_normalize_character_name() {
        assert_eq!(normalize_character_name("JOHN"), "JOHN");
        assert_eq!(normalize_character_name("JOHN (V.O.)"), "JOHN");
        assert_eq!(normalize_character_name("SARAH (O.S.)"), "SARAH");
        assert_eq!(normalize_character_name("BOB (CONT'D)"), "BOB");
        assert_eq!(normalize_character_name("  ALICE  "), "ALICE");
        assert_eq!(normalize_character_name("mary"), "MARY");
    }

    #[test]
    fn test_empty_document() {
        let config = PageConfig::feature_film();
        let elements: Vec<Element> = vec![];

        let stats = calculate_document_stats(&elements, 0, &config);

        assert_eq!(stats.page_count, 0);
        assert_eq!(stats.scene_count, 0);
        assert_eq!(stats.dialogue_block_count, 0);
        assert!(stats.speaking_characters.is_empty());
        assert!(stats.character_dialogue_lines.is_empty());
        assert_eq!(stats.action_dialogue_ratio, 0.5); // Default for empty
    }

    #[test]
    fn test_scene_counting() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
            make_element("4", ElementType::Action, "Cars pass by."),
            make_element("5", ElementType::SceneHeading, "INT. CAR - CONTINUOUS"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        assert_eq!(stats.scene_count, 3);
    }

    #[test]
    fn test_dialogue_block_counting() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Character, "JOHN"),
            make_dialogue("3", "Hello there!", "JOHN"),
            make_element("4", ElementType::Character, "SARAH"),
            make_dialogue("5", "Hi yourself!", "SARAH"),
            make_element("6", ElementType::Character, "JOHN"),
            make_dialogue("7", "How are you?", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        assert_eq!(stats.dialogue_block_count, 3);
    }

    #[test]
    fn test_speaking_characters() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Character, "JOHN"),
            make_dialogue("3", "Hello!", "JOHN"),
            make_element("4", ElementType::Character, "SARAH"),
            make_dialogue("5", "Hi!", "SARAH"),
            make_element("6", ElementType::Character, "BOB"),
            make_dialogue("7", "Hey!", "BOB"),
            make_element("8", ElementType::Character, "JOHN"),
            make_dialogue("9", "Again!", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // Should have 3 unique speaking characters, sorted alphabetically
        assert_eq!(stats.speaking_characters, vec!["BOB", "JOHN", "SARAH"]);
    }

    #[test]
    fn test_character_dialogue_lines() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Character, "JOHN"),
            make_dialogue("3", "A short line.", "JOHN"),
            make_element("4", ElementType::Character, "SARAH"),
            // Longer dialogue that wraps to multiple lines
            make_dialogue("5", "This is a longer line of dialogue that should wrap to at least two lines in the standard screenplay format.", "SARAH"),
            make_element("6", ElementType::Character, "JOHN"),
            make_dialogue("7", "Another short line.", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // JOHN should have 2 dialogue blocks, SARAH should have 1
        assert!(stats.character_dialogue_lines.contains_key("JOHN"));
        assert!(stats.character_dialogue_lines.contains_key("SARAH"));

        // SARAH's longer dialogue should have more lines
        assert!(stats.character_dialogue_lines["SARAH"] > stats.character_dialogue_lines["JOHN"] / 2);
    }

    #[test]
    fn test_action_dialogue_ratio_all_action() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::Action, "People are working."),
            make_element("4", ElementType::Action, "Phones are ringing."),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // All action, no dialogue -> ratio should be 1.0
        assert_eq!(stats.action_dialogue_ratio, 1.0);
    }

    #[test]
    fn test_action_dialogue_ratio_all_dialogue() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Character, "JOHN"),
            make_dialogue("3", "Hello there!", "JOHN"),
            make_element("4", ElementType::Character, "SARAH"),
            make_dialogue("5", "Hi yourself!", "SARAH"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // All dialogue, no action -> ratio should be 0.0
        assert_eq!(stats.action_dialogue_ratio, 0.0);
    }

    #[test]
    fn test_action_dialogue_ratio_mixed() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::Character, "JOHN"),
            make_dialogue("4", "Hello there!", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // Mixed content -> ratio should be between 0 and 1
        assert!(stats.action_dialogue_ratio > 0.0);
        assert!(stats.action_dialogue_ratio < 1.0);
    }

    #[test]
    fn test_estimated_runtime() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
        ];

        // Test with different page counts
        let stats_1 = calculate_document_stats(&elements, 1, &config);
        assert_eq!(stats_1.estimated_runtime_minutes, 1.0);

        let stats_90 = calculate_document_stats(&elements, 90, &config);
        assert_eq!(stats_90.estimated_runtime_minutes, 90.0);

        let stats_120 = calculate_document_stats(&elements, 120, &config);
        assert_eq!(stats_120.estimated_runtime_minutes, 120.0);
    }

    #[test]
    fn test_parenthetical_counted_as_dialogue() {
        let config = PageConfig::feature_film();
        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Character, "JOHN"),
            make_element("3", ElementType::Parenthetical, "(sadly)"),
            make_dialogue("4", "Goodbye.", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // Parenthetical lines should be counted as dialogue
        // So action_dialogue_ratio should be 0.0 (all dialogue)
        assert_eq!(stats.action_dialogue_ratio, 0.0);
    }

    #[test]
    fn test_character_name_from_element_content() {
        let config = PageConfig::feature_film();

        // Test with character_name field not set
        let mut char_elem = make_element("2", ElementType::Character, "JOHN (V.O.)");
        char_elem.character_name = None; // Ensure it's not set

        let elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            char_elem,
            make_dialogue("3", "Hello!", "JOHN"),
        ];

        let stats = calculate_document_stats(&elements, 1, &config);

        // Should normalize "JOHN (V.O.)" to "JOHN"
        assert!(stats.speaking_characters.contains(&"JOHN".to_string()));
    }
}
