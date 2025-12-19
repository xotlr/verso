//! Character CONT'D detection module
//!
//! Detects when the same character speaks after intervening action and marks
//! the Character element for "(CONT'D)" display by the frontend.
//!
//! # Example
//! ```text
//! JOHN
//! Hello there.
//!
//! He walks to the window.
//!
//! JOHN (CONT'D)    <- Engine auto-detects this
//! I should go.
//! ```
//!
//! The detection sets `auto_contd = true` on Character elements where:
//! 1. The same character spoke earlier in the scene
//! 2. There was intervening action/transition/shot between speeches
//! 3. The character name doesn't already have a CONT'D extension

use crate::types::{Element, ElementType};

/// State tracker for character continuation detection within a scene
struct SceneTracker {
    /// Base name of the last character who spoke (e.g., "JOHN" without extensions)
    last_speaker: Option<String>,
    /// Whether there has been intervening action since last speech
    has_intervening_action: bool,
}

impl SceneTracker {
    fn new() -> Self {
        Self {
            last_speaker: None,
            has_intervening_action: false,
        }
    }

    /// Reset tracker at scene boundaries
    fn reset(&mut self) {
        self.last_speaker = None;
        self.has_intervening_action = false;
    }
}

/// Extract the base character name, stripping parenthetical extensions.
///
/// # Examples
/// - "JOHN" -> "JOHN"
/// - "JOHN (V.O.)" -> "JOHN"
/// - "JOHN (O.S.)" -> "JOHN"
/// - "JOHN (CONT'D)" -> "JOHN"
/// - "MARY JANE (V.O.) (CONT'D)" -> "MARY JANE"
/// - "DR. SMITH" -> "DR. SMITH"
fn extract_base_name(name: &str) -> String {
    let trimmed = name.trim();

    // Find the first opening parenthesis - everything before is the base name
    if let Some(paren_pos) = trimmed.find('(') {
        trimmed[..paren_pos].trim().to_string()
    } else {
        trimmed.to_string()
    }
}

/// Check if the character name already contains a CONT'D extension.
///
/// Checks for common variations:
/// - (CONT'D)
/// - (CONT'D.)
/// - (CONTINUED)
/// - (cont'd) - case insensitive
fn has_contd_extension(name: &str) -> bool {
    let upper = name.to_uppercase();
    upper.contains("CONT'D")
        || upper.contains("CONTD")
        || upper.contains("CONT'D.")
        || upper.contains("CONTINUED")
}

/// Detect character CONT'D situations and set `auto_contd` on affected elements.
///
/// This function mutates the elements in place, setting `auto_contd = true` on
/// Character elements where:
/// 1. The same character spoke earlier in the current scene
/// 2. There was intervening action/transition/shot between speeches
/// 3. The character name doesn't already have a CONT'D extension
///
/// # Algorithm
/// - Track `last_speaker` (base name) and `has_intervening_action` per scene
/// - On SceneHeading: reset tracker (new scene = fresh start)
/// - On Character: check for CONT'D condition, update last_speaker
/// - On Action/Transition/Shot: set has_intervening_action = true
/// - On Dialogue/Parenthetical: no state change (continues speech block)
pub fn detect_character_contd(elements: &mut [Element]) {
    let mut tracker = SceneTracker::new();

    for element in elements.iter_mut() {
        match element.element_type {
            // Scene heading resets the tracker - new scene means fresh start
            ElementType::SceneHeading => {
                tracker.reset();
            }

            // Character element - check if CONT'D should be applied
            ElementType::Character => {
                let content = &element.content;
                let base_name = extract_base_name(content);

                // Check if this is a CONT'D situation:
                // 1. Same speaker as before
                // 2. Had intervening action
                // 3. Doesn't already have CONT'D
                if let Some(ref last) = tracker.last_speaker {
                    if base_name.eq_ignore_ascii_case(last)
                        && tracker.has_intervening_action
                        && !has_contd_extension(content)
                    {
                        element.auto_contd = true;
                    }
                }

                // Update tracker: this is now the last speaker
                tracker.last_speaker = Some(base_name);
                // Reset intervening action flag (speech block starting)
                tracker.has_intervening_action = false;
            }

            // These element types count as "intervening action"
            ElementType::Action
            | ElementType::Transition
            | ElementType::Shot
            | ElementType::Super
            | ElementType::Chyron
            | ElementType::Flashback
            | ElementType::Montage
            | ElementType::Intercut => {
                tracker.has_intervening_action = true;
            }

            // Dialogue and Parenthetical continue the speech block - no state change
            ElementType::Dialogue | ElementType::Parenthetical => {
                // No change to tracker state
            }

            // Dual dialogue - treat similarly to regular dialogue
            ElementType::DualDialogueLeft | ElementType::DualDialogueRight => {
                // No change to tracker state
            }

            // Act breaks and page breaks don't affect the tracker
            // (they're formatting, not content)
            ElementType::ActBreak | ElementType::PageBreak | ElementType::BlankLine => {
                // No change to tracker state
            }
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
    fn test_extract_base_name_simple() {
        assert_eq!(extract_base_name("JOHN"), "JOHN");
        assert_eq!(extract_base_name("DR. SMITH"), "DR. SMITH");
    }

    #[test]
    fn test_extract_base_name_with_extension() {
        assert_eq!(extract_base_name("JOHN (V.O.)"), "JOHN");
        assert_eq!(extract_base_name("JOHN (O.S.)"), "JOHN");
        assert_eq!(extract_base_name("JOHN (CONT'D)"), "JOHN");
    }

    #[test]
    fn test_extract_base_name_multiple_extensions() {
        assert_eq!(extract_base_name("JOHN (V.O.) (CONT'D)"), "JOHN");
        assert_eq!(extract_base_name("MARY JANE (O.S.)"), "MARY JANE");
    }

    #[test]
    fn test_extract_base_name_with_whitespace() {
        assert_eq!(extract_base_name("  JOHN  "), "JOHN");
        assert_eq!(extract_base_name("  JOHN (V.O.)  "), "JOHN");
    }

    #[test]
    fn test_has_contd_extension() {
        assert!(has_contd_extension("JOHN (CONT'D)"));
        assert!(has_contd_extension("JOHN (cont'd)"));
        assert!(has_contd_extension("JOHN (CONTINUED)"));
        assert!(has_contd_extension("JOHN (V.O.) (CONT'D)"));
        assert!(!has_contd_extension("JOHN"));
        assert!(!has_contd_extension("JOHN (V.O.)"));
    }

    #[test]
    fn test_same_character_after_action() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello there."),
            make_element("3", ElementType::Action, "He walks to the window."),
            make_element("4", ElementType::Character, "JOHN"),
            make_element("5", ElementType::Dialogue, "I should go."),
        ];

        detect_character_contd(&mut elements);

        // First JOHN should not have auto_contd
        assert!(!elements[0].auto_contd);
        // Second JOHN should have auto_contd (same speaker after action)
        assert!(elements[3].auto_contd);
    }

    #[test]
    fn test_different_character_no_contd() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello there."),
            make_element("3", ElementType::Action, "He walks to the window."),
            make_element("4", ElementType::Character, "MARY"),
            make_element("5", ElementType::Dialogue, "Hi John."),
        ];

        detect_character_contd(&mut elements);

        // Neither character should have auto_contd
        assert!(!elements[0].auto_contd);
        assert!(!elements[3].auto_contd);
    }

    #[test]
    fn test_continuous_dialogue_no_contd() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello there."),
            make_element("3", ElementType::Parenthetical, "(beat)"),
            make_element("4", ElementType::Dialogue, "How are you?"),
            // Same character speaks again immediately (no action)
            make_element("5", ElementType::Character, "JOHN"),
            make_element("6", ElementType::Dialogue, "Still waiting?"),
        ];

        detect_character_contd(&mut elements);

        // No auto_contd because no intervening action
        assert!(!elements[0].auto_contd);
        assert!(!elements[4].auto_contd);
    }

    #[test]
    fn test_scene_heading_resets_tracker() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Action, "He exits."),
            make_element("4", ElementType::SceneHeading, "INT. HALLWAY - DAY"),
            make_element("5", ElementType::Character, "JOHN"),
            make_element("6", ElementType::Dialogue, "New scene."),
        ];

        detect_character_contd(&mut elements);

        // Second JOHN should NOT have auto_contd (new scene)
        assert!(!elements[0].auto_contd);
        assert!(!elements[4].auto_contd);
    }

    #[test]
    fn test_existing_contd_not_doubled() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Action, "He pauses."),
            make_element("4", ElementType::Character, "JOHN (CONT'D)"),
            make_element("5", ElementType::Dialogue, "Goodbye."),
        ];

        detect_character_contd(&mut elements);

        // Should not set auto_contd since it already has CONT'D
        assert!(!elements[0].auto_contd);
        assert!(!elements[3].auto_contd);
    }

    #[test]
    fn test_vo_extension_handled() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN (V.O.)"),
            make_element("2", ElementType::Dialogue, "Narration."),
            make_element("3", ElementType::Action, "We see a flashback."),
            make_element("4", ElementType::Character, "JOHN"),
            make_element("5", ElementType::Dialogue, "Speaking now."),
        ];

        detect_character_contd(&mut elements);

        // "JOHN" matches "JOHN (V.O.)" by base name
        assert!(!elements[0].auto_contd);
        assert!(elements[3].auto_contd);
    }

    #[test]
    fn test_case_insensitive_matching() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Action, "He pauses."),
            make_element("4", ElementType::Character, "John"),
            make_element("5", ElementType::Dialogue, "Goodbye."),
        ];

        detect_character_contd(&mut elements);

        // Should match case-insensitively
        assert!(elements[3].auto_contd);
    }

    #[test]
    fn test_transition_counts_as_action() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Transition, "CUT TO:"),
            make_element("4", ElementType::Character, "JOHN"),
            make_element("5", ElementType::Dialogue, "After transition."),
        ];

        detect_character_contd(&mut elements);

        // Transition counts as intervening action
        assert!(elements[3].auto_contd);
    }

    #[test]
    fn test_shot_counts_as_action() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Shot, "CLOSE ON - John's face"),
            make_element("4", ElementType::Character, "JOHN"),
            make_element("5", ElementType::Dialogue, "After shot."),
        ];

        detect_character_contd(&mut elements);

        // Shot counts as intervening action
        assert!(elements[3].auto_contd);
    }

    #[test]
    fn test_multiple_characters_complex() {
        let mut elements = vec![
            make_element("1", ElementType::Character, "JOHN"),
            make_element("2", ElementType::Dialogue, "Hello."),
            make_element("3", ElementType::Character, "MARY"),
            make_element("4", ElementType::Dialogue, "Hi."),
            make_element("5", ElementType::Action, "Awkward silence."),
            make_element("6", ElementType::Character, "JOHN"),
            make_element("7", ElementType::Dialogue, "So..."),
            make_element("8", ElementType::Action, "He fidgets."),
            make_element("9", ElementType::Character, "JOHN"),
            make_element("10", ElementType::Dialogue, "Anyway."),
        ];

        detect_character_contd(&mut elements);

        // First JOHN - no (first speaker)
        assert!(!elements[0].auto_contd);
        // MARY - no (different speaker, no intervening action from her POV)
        assert!(!elements[2].auto_contd);
        // Second JOHN - yes (action after MARY, but JOHN spoke before MARY)
        // Actually: MARY spoke last, so JOHN is different from last speaker
        assert!(!elements[5].auto_contd);
        // Third JOHN - yes (same speaker as second JOHN, action in between)
        assert!(elements[8].auto_contd);
    }

    #[test]
    fn test_empty_elements() {
        let mut elements: Vec<Element> = vec![];
        detect_character_contd(&mut elements);
        // Should not panic on empty input
    }

    #[test]
    fn test_only_action_elements() {
        let mut elements = vec![
            make_element("1", ElementType::Action, "He walks."),
            make_element("2", ElementType::Action, "She runs."),
        ];

        detect_character_contd(&mut elements);
        // Should not panic, no changes expected
    }
}
