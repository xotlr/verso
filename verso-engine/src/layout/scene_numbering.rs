//! Scene Numbering module
//!
//! Assigns scene numbers to SceneHeading elements based on configuration.
//! Scene numbers appear on both sides of scene headings in production/shooting scripts.
//!
//! # Modes
//!
//! - **Disabled**: No scene numbers (default, for spec scripts)
//! - **Auto**: Auto-generate sequential numbers starting from `starting_number`
//! - **Manual**: Use numbers from element data (preserve existing)
//! - **Locked**: Preserve existing, handle A-pages (future enhancement)
//!
//! # Example
//!
//! ```text
//! 1   INT. OFFICE - DAY                                                1
//! 2   EXT. STREET - NIGHT                                              2
//! ```

use crate::types::{Element, ElementType, SceneNumberingConfig, SceneNumberingMode};

/// Assign scene numbers to SceneHeading elements based on configuration.
///
/// This function mutates the elements in place, setting `scene_number` on
/// SceneHeading elements according to the configured mode.
///
/// # Arguments
///
/// * `elements` - Mutable slice of screenplay elements
/// * `config` - Scene numbering configuration
///
/// # Modes
///
/// * `Disabled` - Does nothing (scene_number remains None)
/// * `Auto` - Assigns sequential numbers: starting_number, starting_number+1, etc.
///           If prefix is set, prepends to number (e.g., "A1", "A2")
/// * `Manual` - Preserves existing scene_number values (no changes)
/// * `Locked` - Same as Manual for now (A-page handling is future work)
pub fn assign_scene_numbers(elements: &mut [Element], config: &SceneNumberingConfig) {
    match config.mode {
        SceneNumberingMode::Disabled => {
            // Do nothing - scene numbers remain None
        }

        SceneNumberingMode::Auto => {
            assign_auto_scene_numbers(elements, config);
        }

        SceneNumberingMode::Manual | SceneNumberingMode::Locked => {
            // Manual and Locked modes preserve existing scene_number values
            // The frontend is responsible for setting these values
            // Locked mode will handle A-pages in a future enhancement
        }
    }
}

/// Assign sequential scene numbers to SceneHeading elements.
///
/// Numbers start from `config.starting_number` and increment for each SceneHeading.
/// If `config.prefix` is set, it's prepended to each number.
fn assign_auto_scene_numbers(elements: &mut [Element], config: &SceneNumberingConfig) {
    let mut current_number = config.starting_number;

    for element in elements.iter_mut() {
        if element.element_type == ElementType::SceneHeading {
            // Format the scene number
            let scene_number = match &config.prefix {
                Some(prefix) => format!("{}{}", prefix, current_number),
                None => current_number.to_string(),
            };

            element.scene_number = Some(scene_number);
            current_number += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ElementId;

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

    #[test]
    fn test_disabled_mode_no_changes() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Disabled,
            starting_number: 1,
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        ];

        assign_scene_numbers(&mut elements, &config);

        // All scene_number fields should remain None
        assert!(elements[0].scene_number.is_none());
        assert!(elements[1].scene_number.is_none());
        assert!(elements[2].scene_number.is_none());
    }

    #[test]
    fn test_auto_mode_sequential_numbers() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 1,
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::Action, "A busy office."),
            make_element("3", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
            make_element("4", ElementType::Action, "Cars pass by."),
            make_element("5", ElementType::SceneHeading, "INT. CAR - CONTINUOUS"),
        ];

        assign_scene_numbers(&mut elements, &config);

        // SceneHeadings should have sequential numbers
        assert_eq!(elements[0].scene_number, Some("1".to_string()));
        assert!(elements[1].scene_number.is_none()); // Action - no number
        assert_eq!(elements[2].scene_number, Some("2".to_string()));
        assert!(elements[3].scene_number.is_none()); // Action - no number
        assert_eq!(elements[4].scene_number, Some("3".to_string()));
    }

    #[test]
    fn test_auto_mode_starting_number() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 42, // Start from 42 (e.g., series continuation)
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        ];

        assign_scene_numbers(&mut elements, &config);

        assert_eq!(elements[0].scene_number, Some("42".to_string()));
        assert_eq!(elements[1].scene_number, Some("43".to_string()));
    }

    #[test]
    fn test_auto_mode_with_prefix() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 1,
            prefix: Some("A".to_string()), // Episode A
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
            make_element("3", ElementType::SceneHeading, "INT. CAR - CONTINUOUS"),
        ];

        assign_scene_numbers(&mut elements, &config);

        assert_eq!(elements[0].scene_number, Some("A1".to_string()));
        assert_eq!(elements[1].scene_number, Some("A2".to_string()));
        assert_eq!(elements[2].scene_number, Some("A3".to_string()));
    }

    #[test]
    fn test_manual_mode_preserves_existing() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Manual,
            starting_number: 1,
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        ];

        // Manually set scene numbers
        elements[0].scene_number = Some("5".to_string());
        elements[1].scene_number = Some("7".to_string());

        assign_scene_numbers(&mut elements, &config);

        // Manual mode should preserve existing values
        assert_eq!(elements[0].scene_number, Some("5".to_string()));
        assert_eq!(elements[1].scene_number, Some("7".to_string()));
    }

    #[test]
    fn test_locked_mode_preserves_existing() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Locked,
            starting_number: 1,
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        ];

        // Set scene numbers including an A-page style number
        elements[0].scene_number = Some("47".to_string());
        elements[1].scene_number = Some("47A".to_string());

        assign_scene_numbers(&mut elements, &config);

        // Locked mode should preserve existing values
        assert_eq!(elements[0].scene_number, Some("47".to_string()));
        assert_eq!(elements[1].scene_number, Some("47A".to_string()));
    }

    #[test]
    fn test_empty_elements() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 1,
            prefix: None,
        };

        let mut elements: Vec<Element> = vec![];

        // Should not panic on empty input
        assign_scene_numbers(&mut elements, &config);
    }

    #[test]
    fn test_no_scene_headings() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 1,
            prefix: None,
        };

        let mut elements = vec![
            make_element("1", ElementType::Action, "Opening action."),
            make_element("2", ElementType::Character, "JOHN"),
            make_element("3", ElementType::Dialogue, "Hello there."),
        ];

        assign_scene_numbers(&mut elements, &config);

        // No elements should have scene numbers
        assert!(elements[0].scene_number.is_none());
        assert!(elements[1].scene_number.is_none());
        assert!(elements[2].scene_number.is_none());
    }

    #[test]
    fn test_prefix_with_starting_number() {
        let config = SceneNumberingConfig {
            mode: SceneNumberingMode::Auto,
            starting_number: 10, // Episode B starts at scene 10
            prefix: Some("B".to_string()),
        };

        let mut elements = vec![
            make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        ];

        assign_scene_numbers(&mut elements, &config);

        assert_eq!(elements[0].scene_number, Some("B10".to_string()));
        assert_eq!(elements[1].scene_number, Some("B11".to_string()));
    }
}
