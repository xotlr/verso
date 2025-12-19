//! Fountain format export for screenplay elements.
//!
//! Fountain is a plain-text screenplay format that uses simple markup
//! conventions to represent screenplay elements. This module converts
//! Verso's internal representation to valid Fountain syntax.
//!
//! # Fountain Format Reference
//!
//! - Scene headings: Uppercase, preceded by blank line
//! - Action: Normal text with blank line after
//! - Character: Uppercase, no blank line before dialogue
//! - Dialogue: Normal text after character
//! - Parenthetical: In parentheses between character and dialogue
//! - Transition: Prefixed with `>`, uppercase
//! - Dual dialogue: Use `^` marker for second character
//! - Page break: `===`
//! - Notes: `[[note text]]`
//! - Centered: `> text <`
//!
//! See: https://fountain.io/syntax

use crate::types::{DocumentMetadata, Element, ElementType};

/// Export screenplay elements to Fountain format.
///
/// This function converts a slice of screenplay elements and optional metadata
/// into a valid Fountain-formatted string. The output can be saved as a `.fountain`
/// file and opened by any Fountain-compatible application.
///
/// # Arguments
///
/// * `elements` - Slice of screenplay elements to export
/// * `metadata` - Optional document metadata for the title page
///
/// # Returns
///
/// A `String` containing the Fountain-formatted screenplay.
///
/// # Example
///
/// ```ignore
/// use verso_pagination_engine::export::export_to_fountain;
/// use verso_pagination_engine::{Element, ElementType, DocumentMetadata};
///
/// let elements = vec![
///     Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
///     Element::new("2", ElementType::Action, "JOHN walks into the office."),
///     Element::new("3", ElementType::Character, "JOHN"),
///     Element::new("4", ElementType::Dialogue, "Hello, is anyone here?"),
/// ];
///
/// let metadata = DocumentMetadata::new()
///     .title("My Screenplay")
///     .author("John Smith")
///     .draft("First Draft")
///     .date("December 2025");
///
/// let fountain = export_to_fountain(&elements, Some(&metadata));
/// ```
pub fn export_to_fountain(
    elements: &[Element],
    metadata: Option<&DocumentMetadata>,
) -> String {
    let mut output = String::new();

    // Title page metadata
    if let Some(meta) = metadata {
        output.push_str(&format_title_page(meta));
    }

    // Track previous element type for proper spacing
    let mut prev_type: Option<ElementType> = None;
    let mut in_dual_dialogue = false;

    for element in elements {
        let formatted = format_element(element, prev_type, &mut in_dual_dialogue);
        output.push_str(&formatted);
        prev_type = Some(element.element_type);
    }

    output
}

/// Format the title page metadata section.
///
/// Fountain title pages use key-value pairs at the start of the file,
/// followed by a blank line to separate from the content.
fn format_title_page(metadata: &DocumentMetadata) -> String {
    let mut output = String::new();
    let mut has_content = false;

    if let Some(title) = &metadata.title {
        output.push_str(&format!("Title: {}\n", title));
        has_content = true;
    }

    if let Some(author) = &metadata.author {
        // Fountain uses "Author:" for writer credit
        output.push_str(&format!("Author: {}\n", author));
        has_content = true;
    }

    if let Some(draft) = &metadata.draft {
        output.push_str(&format!("Draft date: {}\n", draft));
        has_content = true;
    }

    if let Some(date) = &metadata.date {
        // If we already have draft, use a separate date field
        // Otherwise, include in Draft date
        if metadata.draft.is_some() {
            output.push_str(&format!("Date: {}\n", date));
        } else {
            output.push_str(&format!("Draft date: {}\n", date));
        }
        has_content = true;
    }

    if let Some(contact) = &metadata.contact {
        output.push_str(&format!("Contact: {}\n", contact));
        has_content = true;
    }

    if let Some(copyright) = &metadata.copyright {
        output.push_str(&format!("Copyright: {}\n", copyright));
        has_content = true;
    }

    if let Some(notes) = &metadata.notes {
        output.push_str(&format!("Notes: {}\n", notes));
        has_content = true;
    }

    // Add blank line after title page if we had any content
    if has_content {
        output.push('\n');
    }

    output
}

/// Format a single element to Fountain syntax.
///
/// This function handles the conversion of each element type to its
/// Fountain representation, including proper spacing and markers.
fn format_element(
    element: &Element,
    prev_type: Option<ElementType>,
    in_dual_dialogue: &mut bool,
) -> String {
    match element.element_type {
        ElementType::SceneHeading => format_scene_heading(element, prev_type),
        ElementType::Action => format_action(element, prev_type),
        ElementType::Character => format_character(element, prev_type, in_dual_dialogue),
        ElementType::Dialogue => format_dialogue(element),
        ElementType::Parenthetical => format_parenthetical(element),
        ElementType::Transition => format_transition(element, prev_type),
        ElementType::Shot => format_shot(element, prev_type),
        ElementType::DualDialogueLeft => format_dual_dialogue_left(element, prev_type, in_dual_dialogue),
        ElementType::DualDialogueRight => format_dual_dialogue_right(element, in_dual_dialogue),
        ElementType::ActBreak => format_act_break(element, prev_type),
        ElementType::PageBreak => format_page_break(),
        ElementType::BlankLine => format_blank_line(),
        // Centered elements (Super, Chyron, Flashback, Montage, Intercut)
        ElementType::Super | ElementType::Chyron => format_centered(element, prev_type),
        ElementType::Flashback | ElementType::Montage | ElementType::Intercut => {
            format_scene_modifier(element, prev_type)
        }
    }
}

/// Format a scene heading.
///
/// Scene headings in Fountain start with INT., EXT., INT./EXT., or similar.
/// We force uppercase and add a blank line before (unless at document start).
fn format_scene_heading(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    // Add blank line before if not at document start
    if prev_type.is_some() {
        output.push('\n');
    }

    // Scene headings are uppercase
    let content = element.content.to_uppercase();

    // If scene number is assigned, format it
    if let Some(scene_num) = &element.scene_number {
        // Fountain scene numbers: INT. OFFICE - DAY #1#
        output.push_str(&format!("{} #{}#\n", content, scene_num));
    } else {
        output.push_str(&format!("{}\n", content));
    }

    output.push('\n');
    output
}

/// Format an action line.
///
/// Action is normal text. We add a blank line before if following
/// dialogue or certain other elements for proper visual separation.
fn format_action(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    // Add blank line before if following dialogue or character
    if let Some(prev) = prev_type {
        match prev {
            ElementType::Dialogue | ElementType::Parenthetical => {
                output.push('\n');
            }
            _ => {}
        }
    }

    output.push_str(&element.content);
    output.push_str("\n\n");
    output
}

/// Format a character name.
///
/// Character names must be uppercase in Fountain.
/// The `@` prefix forces character recognition for unusual names.
fn format_character(
    element: &Element,
    prev_type: Option<ElementType>,
    in_dual_dialogue: &mut bool,
) -> String {
    let mut output = String::new();

    // Add blank line before character if not following dialogue elements
    if let Some(prev) = prev_type {
        match prev {
            ElementType::Dialogue | ElementType::Parenthetical | ElementType::Character => {}
            _ => {
                output.push('\n');
            }
        }
    }

    // Reset dual dialogue state for regular characters
    *in_dual_dialogue = false;

    // Character name in uppercase
    let content = element.content.to_uppercase();

    // Check if we need to add CONT'D
    if element.auto_contd {
        output.push_str(&format!("{} (CONT'D)\n", content));
    } else {
        output.push_str(&format!("{}\n", content));
    }

    output
}

/// Format dialogue text.
fn format_dialogue(_element: &Element) -> String {
    // Dialogue follows character directly, no blank line
    format!("{}\n", _element.content)
}

/// Format a parenthetical.
///
/// Parentheticals are wrapped in parentheses. If the content
/// already has them, we don't double-wrap.
fn format_parenthetical(element: &Element) -> String {
    let content = element.content.trim();

    // Check if already wrapped in parentheses
    if content.starts_with('(') && content.ends_with(')') {
        format!("{}\n", content)
    } else {
        format!("({})\n", content)
    }
}

/// Format a transition.
///
/// Transitions in Fountain are right-aligned using `>` prefix.
/// They should be uppercase.
fn format_transition(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    // Add blank line before
    if prev_type.is_some() {
        output.push('\n');
    }

    let content = element.content.to_uppercase();
    output.push_str(&format!("> {}\n\n", content));
    output
}

/// Format a shot element.
///
/// Shots are similar to scene headings but don't require INT./EXT.
fn format_shot(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    if prev_type.is_some() {
        output.push('\n');
    }

    // Force uppercase for shots
    output.push_str(&format!("{}\n\n", element.content.to_uppercase()));
    output
}

/// Format left side of dual dialogue.
///
/// In Fountain, dual dialogue is marked by adding `^` to the
/// second character's name.
fn format_dual_dialogue_left(
    element: &Element,
    prev_type: Option<ElementType>,
    in_dual_dialogue: &mut bool,
) -> String {
    *in_dual_dialogue = true;

    // Format as regular character for the left side
    format_character_for_dual(element, prev_type)
}

/// Format right side of dual dialogue.
///
/// The right character gets the `^` marker.
fn format_dual_dialogue_right(
    element: &Element,
    in_dual_dialogue: &mut bool,
) -> String {
    let mut output = String::new();

    // Character name with dual dialogue marker
    let content = element.content.to_uppercase();
    output.push_str(&format!("{} ^\n", content));

    *in_dual_dialogue = false;
    output
}

/// Helper for formatting character in dual dialogue context.
fn format_character_for_dual(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    if let Some(prev) = prev_type {
        match prev {
            ElementType::Dialogue | ElementType::Parenthetical | ElementType::Character => {}
            _ => {
                output.push('\n');
            }
        }
    }

    output.push_str(&format!("{}\n", element.content.to_uppercase()));
    output
}

/// Format an act break.
///
/// Act breaks are centered and typically in uppercase.
/// We use Fountain's centered text syntax: `> text <`
fn format_act_break(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    if prev_type.is_some() {
        output.push('\n');
    }

    let content = element.content.to_uppercase();
    output.push_str(&format!("> {} <\n\n", content));
    output
}

/// Format a page break.
///
/// Fountain uses `===` for page breaks.
fn format_page_break() -> String {
    "===\n\n".to_string()
}

/// Format a blank line.
fn format_blank_line() -> String {
    "\n".to_string()
}

/// Format centered text (Super, Chyron).
fn format_centered(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    if prev_type.is_some() {
        output.push('\n');
    }

    let content = element.content.to_uppercase();
    output.push_str(&format!("> {} <\n\n", content));
    output
}

/// Format scene modifiers (Flashback, Montage, Intercut).
///
/// These are typically formatted like scene headings.
fn format_scene_modifier(element: &Element, prev_type: Option<ElementType>) -> String {
    let mut output = String::new();

    if prev_type.is_some() {
        output.push('\n');
    }

    let content = element.content.to_uppercase();
    output.push_str(&format!("{}\n\n", content));
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_empty_document() {
        let elements: Vec<Element> = vec![];
        let result = export_to_fountain(&elements, None);
        assert_eq!(result, "");
    }

    #[test]
    fn test_export_title_page() {
        let elements: Vec<Element> = vec![];
        let metadata = DocumentMetadata::new()
            .title("My Screenplay")
            .author("John Smith")
            .draft("First Draft");

        let result = export_to_fountain(&elements, Some(&metadata));

        assert!(result.contains("Title: My Screenplay"));
        assert!(result.contains("Author: John Smith"));
        assert!(result.contains("Draft date: First Draft"));
        // Should end with blank line after title page
        assert!(result.ends_with("\n\n"));
    }

    #[test]
    fn test_export_title_page_with_all_fields() {
        let elements: Vec<Element> = vec![];
        let metadata = DocumentMetadata::new()
            .title("Test Script")
            .author("Jane Writer")
            .draft("Second Draft")
            .date("December 2025")
            .contact("jane@example.com")
            .copyright("Copyright 2025 Jane Writer")
            .notes("Based on a true story");

        let result = export_to_fountain(&elements, Some(&metadata));

        assert!(result.contains("Title: Test Script"));
        assert!(result.contains("Author: Jane Writer"));
        assert!(result.contains("Draft date: Second Draft"));
        assert!(result.contains("Date: December 2025"));
        assert!(result.contains("Contact: jane@example.com"));
        assert!(result.contains("Copyright: Copyright 2025 Jane Writer"));
        assert!(result.contains("Notes: Based on a true story"));
    }

    #[test]
    fn test_export_scene_heading() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("INT. OFFICE - DAY"));
    }

    #[test]
    fn test_export_scene_heading_with_number() {
        let mut element = Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY");
        element.scene_number = Some("42".to_string());
        let elements = vec![element];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("INT. OFFICE - DAY #42#"));
    }

    #[test]
    fn test_export_scene_heading_lowercase_converted() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "int. office - day"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("INT. OFFICE - DAY"));
    }

    #[test]
    fn test_export_action() {
        let elements = vec![
            Element::new("1", ElementType::Action, "JOHN walks into the office."),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("JOHN walks into the office."));
    }

    #[test]
    fn test_export_character_dialogue() {
        let elements = vec![
            Element::new("1", ElementType::Character, "JOHN"),
            Element::new("2", ElementType::Dialogue, "Hello, is anyone here?"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("JOHN\n"));
        assert!(result.contains("Hello, is anyone here?"));
    }

    #[test]
    fn test_export_character_with_contd() {
        let mut element = Element::new("1", ElementType::Character, "JOHN");
        element.auto_contd = true;
        let elements = vec![element];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("JOHN (CONT'D)"));
    }

    #[test]
    fn test_export_parenthetical() {
        let elements = vec![
            Element::new("1", ElementType::Character, "JOHN"),
            Element::new("2", ElementType::Parenthetical, "beat"),
            Element::new("3", ElementType::Dialogue, "Well then."),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("(beat)"));
    }

    #[test]
    fn test_export_parenthetical_already_wrapped() {
        let elements = vec![
            Element::new("1", ElementType::Character, "JOHN"),
            Element::new("2", ElementType::Parenthetical, "(beat)"),
            Element::new("3", ElementType::Dialogue, "Well then."),
        ];

        let result = export_to_fountain(&elements, None);

        // Should not double-wrap
        assert!(result.contains("(beat)"));
        assert!(!result.contains("((beat))"));
    }

    #[test]
    fn test_export_transition() {
        let elements = vec![
            Element::new("1", ElementType::Action, "John stares."),
            Element::new("2", ElementType::Transition, "FADE OUT."),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("> FADE OUT."));
    }

    #[test]
    fn test_export_page_break() {
        let elements = vec![
            Element::new("1", ElementType::Action, "Some action."),
            Element::new("2", ElementType::PageBreak, ""),
            Element::new("3", ElementType::Action, "More action."),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("==="));
    }

    #[test]
    fn test_export_act_break() {
        let elements = vec![
            Element::new("1", ElementType::ActBreak, "END OF ACT ONE"),
        ];

        let result = export_to_fountain(&elements, None);

        // Act breaks are centered
        assert!(result.contains("> END OF ACT ONE <"));
    }

    #[test]
    fn test_export_full_scene() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            Element::new("2", ElementType::Action, "JOHN walks into the office."),
            Element::new("3", ElementType::Character, "JOHN"),
            Element::new("4", ElementType::Dialogue, "Hello, is anyone here?"),
            Element::new("5", ElementType::Character, "SARAH"),
            Element::new("6", ElementType::Parenthetical, "from behind a desk"),
            Element::new("7", ElementType::Dialogue, "Over here!"),
            Element::new("8", ElementType::Transition, "FADE OUT."),
        ];

        let metadata = DocumentMetadata::new()
            .title("Test Script")
            .author("Test Author");

        let result = export_to_fountain(&elements, Some(&metadata));

        // Verify structure
        assert!(result.starts_with("Title: Test Script\n"));
        assert!(result.contains("Author: Test Author"));
        assert!(result.contains("INT. OFFICE - DAY"));
        assert!(result.contains("JOHN walks into the office."));
        assert!(result.contains("JOHN\nHello, is anyone here?"));
        assert!(result.contains("SARAH\n(from behind a desk)\nOver here!"));
        assert!(result.contains("> FADE OUT."));
    }

    #[test]
    fn test_export_shot() {
        let elements = vec![
            Element::new("1", ElementType::Shot, "ANGLE ON - John's face"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("ANGLE ON - JOHN'S FACE"));
    }

    #[test]
    fn test_export_centered_elements() {
        let elements = vec![
            Element::new("1", ElementType::Super, "New York City, 1985"),
            Element::new("2", ElementType::Chyron, "Three months later"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("> NEW YORK CITY, 1985 <"));
        assert!(result.contains("> THREE MONTHS LATER <"));
    }

    #[test]
    fn test_export_scene_modifiers() {
        let elements = vec![
            Element::new("1", ElementType::Flashback, "FLASHBACK - INT. HOUSE - NIGHT"),
            Element::new("2", ElementType::Montage, "MONTAGE:"),
            Element::new("3", ElementType::Intercut, "INTERCUT WITH:"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("FLASHBACK - INT. HOUSE - NIGHT"));
        assert!(result.contains("MONTAGE:"));
        assert!(result.contains("INTERCUT WITH:"));
    }

    #[test]
    fn test_export_blank_line() {
        let elements = vec![
            Element::new("1", ElementType::Action, "First action."),
            Element::new("2", ElementType::BlankLine, ""),
            Element::new("3", ElementType::Action, "Second action."),
        ];

        let result = export_to_fountain(&elements, None);

        // Should have extra spacing from blank line
        assert!(result.contains("First action.\n\n\n"));
    }

    #[test]
    fn test_export_special_characters() {
        let elements = vec![
            Element::new("1", ElementType::Character, "O'BRIEN"),
            Element::new("2", ElementType::Dialogue, "That's what I said -- isn't it?"),
        ];

        let result = export_to_fountain(&elements, None);

        assert!(result.contains("O'BRIEN"));
        assert!(result.contains("That's what I said -- isn't it?"));
    }

    #[test]
    fn test_export_empty_metadata() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        ];
        let metadata = DocumentMetadata::default();

        let result = export_to_fountain(&elements, Some(&metadata));

        // Should not have title page section since metadata is empty
        assert!(result.starts_with("INT. OFFICE - DAY"));
    }

    #[test]
    fn test_dual_dialogue_formatting() {
        let elements = vec![
            Element::new("1", ElementType::DualDialogueLeft, "JOHN"),
            Element::new("2", ElementType::Dialogue, "I agree!"),
            Element::new("3", ElementType::DualDialogueRight, "SARAH"),
            Element::new("4", ElementType::Dialogue, "Me too!"),
        ];

        let result = export_to_fountain(&elements, None);

        // First character without ^, second with ^
        assert!(result.contains("JOHN\n"));
        assert!(result.contains("SARAH ^"));
    }
}
