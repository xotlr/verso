//! FDX (Final Draft) format export for screenplay elements.
//!
//! FDX is Final Draft's XML-based screenplay format. This module converts
//! Verso's internal representation to valid FDX syntax for compatibility
//! with Final Draft and other professional screenwriting software.
//!
//! # FDX Format Reference
//!
//! FDX files are XML documents with the following structure:
//! ```xml
//! <?xml version="1.0" encoding="UTF-8"?>
//! <FinalDraft DocumentType="Script" Template="No" Version="5">
//!   <Content>
//!     <Paragraph Type="Scene Heading">
//!       <Text>INT. OFFICE - DAY</Text>
//!     </Paragraph>
//!   </Content>
//!   <TitlePage>
//!     <Content>
//!       <Paragraph Type="Title">
//!         <Text>MY SCREENPLAY</Text>
//!       </Paragraph>
//!     </Content>
//!   </TitlePage>
//! </FinalDraft>
//! ```
//!
//! # Supported Paragraph Types
//!
//! - "Scene Heading" - INT./EXT. lines
//! - "Action" - Action/description blocks
//! - "Character" - Character names
//! - "Dialogue" - Dialogue text
//! - "Parenthetical" - Actor directions
//! - "Transition" - FADE OUT, CUT TO, etc.
//! - "Shot" - Camera directions
//! - "General" - Fallback for unmapped types

use crate::types::{DocumentMetadata, Element, ElementType};

/// Export screenplay elements to FDX (Final Draft) format.
///
/// This function converts a slice of screenplay elements and optional metadata
/// into a valid FDX-formatted XML string. The output can be saved as a `.fdx`
/// file and opened by Final Draft or other FDX-compatible applications.
///
/// # Arguments
///
/// * `elements` - Slice of screenplay elements to export
/// * `metadata` - Optional document metadata for the title page
///
/// # Returns
///
/// A `String` containing the FDX-formatted XML.
///
/// # Example
///
/// ```ignore
/// use verso_pagination_engine::export::export_to_fdx;
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
/// let fdx = export_to_fdx(&elements, Some(&metadata));
/// ```
pub fn export_to_fdx(elements: &[Element], metadata: Option<&DocumentMetadata>) -> String {
    let mut xml = String::with_capacity(elements.len() * 100);

    // XML declaration and root element
    xml.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>"#);
    xml.push('\n');
    xml.push_str(r#"<FinalDraft DocumentType="Script" Template="No" Version="5">"#);
    xml.push('\n');

    // Content section
    xml.push_str("  <Content>\n");
    for element in elements {
        xml.push_str(&format_paragraph(element));
    }
    xml.push_str("  </Content>\n");

    // Title page if metadata exists and has content
    if let Some(meta) = metadata {
        if !meta.is_empty() {
            xml.push_str(&format_title_page(meta));
        }
    }

    xml.push_str("</FinalDraft>\n");
    xml
}

/// Convert an ElementType to its FDX Paragraph Type string.
///
/// FDX uses specific type names for each screenplay element. This function
/// maps our internal ElementType enum to the corresponding FDX type string.
fn element_type_to_fdx(element_type: ElementType) -> &'static str {
    match element_type {
        ElementType::SceneHeading => "Scene Heading",
        ElementType::Action => "Action",
        ElementType::Character => "Character",
        ElementType::Dialogue => "Dialogue",
        ElementType::Parenthetical => "Parenthetical",
        ElementType::Transition => "Transition",
        ElementType::Shot => "Shot",
        ElementType::Super => "Action", // FDX doesn't have a native Super type
        ElementType::Chyron => "Action", // FDX doesn't have a native Chyron type
        ElementType::Flashback => "Scene Heading", // Treat as scene heading variant
        ElementType::Montage => "Scene Heading", // Treat as scene heading variant
        ElementType::Intercut => "Scene Heading", // Treat as scene heading variant
        ElementType::DualDialogueLeft => "Character", // Part of dual dialogue
        ElementType::DualDialogueRight => "Character", // Part of dual dialogue
        ElementType::ActBreak => "Action", // FDX doesn't have native act breaks
        ElementType::PageBreak => "Action", // Page breaks handled separately
        ElementType::BlankLine => "Action", // Empty action line
    }
}

/// Format a single element as an FDX Paragraph element.
///
/// This generates XML like:
/// ```xml
///     <Paragraph Type="Scene Heading" Number="1">
///       <Text>INT. OFFICE - DAY</Text>
///     </Paragraph>
/// ```
fn format_paragraph(element: &Element) -> String {
    let fdx_type = element_type_to_fdx(element.element_type);
    let escaped_content = escape_xml(&element.content);

    // Build attributes
    let mut attrs = format!(r#"Type="{}""#, fdx_type);

    // Add scene number for scene headings if present
    if element.element_type == ElementType::SceneHeading {
        if let Some(scene_num) = &element.scene_number {
            attrs.push_str(&format!(r#" Number="{}""#, escape_xml(scene_num)));
        }
    }

    // Handle dual dialogue
    if element.element_type == ElementType::DualDialogueLeft
        || element.element_type == ElementType::DualDialogueRight
    {
        attrs.push_str(r#" DualDialogue="Yes""#);
    }

    // Handle CONT'D for characters
    let display_content = if element.element_type == ElementType::Character && element.auto_contd {
        format!("{} (CONT'D)", escaped_content)
    } else {
        escaped_content
    };

    format!(
        "    <Paragraph {}>\n      <Text>{}</Text>\n    </Paragraph>\n",
        attrs, display_content
    )
}

/// Format the title page section of the FDX document.
///
/// FDX title pages use special paragraph types:
/// - "Title" - The script title
/// - "Author" - Writer credits (multiple paragraphs for "Written by" + name)
/// - "Contact" - Contact information
/// - "Draft" - Draft information
fn format_title_page(metadata: &DocumentMetadata) -> String {
    let mut xml = String::new();

    xml.push_str("  <TitlePage>\n");
    xml.push_str("    <Content>\n");

    // Title
    if let Some(title) = &metadata.title {
        xml.push_str(&format_title_paragraph("Title", &escape_xml(title)));
    }

    // Author (with "Written by" convention)
    if let Some(author) = &metadata.author {
        xml.push_str(&format_title_paragraph("Author", "Written by"));
        xml.push_str(&format_title_paragraph("Author", &escape_xml(author)));
    }

    // Draft info
    if let Some(draft) = &metadata.draft {
        xml.push_str(&format_title_paragraph("Draft", &escape_xml(draft)));
    }

    // Date
    if let Some(date) = &metadata.date {
        xml.push_str(&format_title_paragraph("Draft", &escape_xml(date)));
    }

    // Contact
    if let Some(contact) = &metadata.contact {
        // Contact may have multiple lines, split them
        for line in contact.lines() {
            xml.push_str(&format_title_paragraph("Contact", &escape_xml(line)));
        }
    }

    // Copyright
    if let Some(copyright) = &metadata.copyright {
        xml.push_str(&format_title_paragraph("Contact", &escape_xml(copyright)));
    }

    // Notes
    if let Some(notes) = &metadata.notes {
        xml.push_str(&format_title_paragraph("Contact", &escape_xml(notes)));
    }

    xml.push_str("    </Content>\n");
    xml.push_str("  </TitlePage>\n");

    xml
}

/// Format a single title page paragraph.
fn format_title_paragraph(para_type: &str, content: &str) -> String {
    format!(
        "      <Paragraph Type=\"{}\">\n        <Text>{}</Text>\n      </Paragraph>\n",
        para_type, content
    )
}

/// Escape special XML characters in a string.
///
/// This ensures the content is safe to include in XML elements:
/// - `&` becomes `&amp;`
/// - `<` becomes `&lt;`
/// - `>` becomes `&gt;`
/// - `"` becomes `&quot;`
/// - `'` becomes `&apos;`
fn escape_xml(s: &str) -> String {
    let mut result = String::with_capacity(s.len());

    for c in s.chars() {
        match c {
            '&' => result.push_str("&amp;"),
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&apos;"),
            _ => result.push(c),
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_empty_document() {
        let elements: Vec<Element> = vec![];
        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<?xml version="1.0" encoding="UTF-8"?>"#));
        assert!(result.contains(r#"<FinalDraft DocumentType="Script" Template="No" Version="5">"#));
        assert!(result.contains("<Content>"));
        assert!(result.contains("</Content>"));
        assert!(result.contains("</FinalDraft>"));
        // Should not have title page without metadata
        assert!(!result.contains("<TitlePage>"));
    }

    #[test]
    fn test_export_scene_heading() {
        let elements = vec![Element::new(
            "1",
            ElementType::SceneHeading,
            "INT. OFFICE - DAY",
        )];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Scene Heading">"#));
        assert!(result.contains("<Text>INT. OFFICE - DAY</Text>"));
    }

    #[test]
    fn test_export_scene_heading_with_number() {
        let mut element = Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY");
        element.scene_number = Some("42".to_string());
        let elements = vec![element];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Scene Heading" Number="42">"#));
        assert!(result.contains("<Text>INT. OFFICE - DAY</Text>"));
    }

    #[test]
    fn test_export_action() {
        let elements = vec![Element::new(
            "1",
            ElementType::Action,
            "JOHN walks into the office.",
        )];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Action">"#));
        assert!(result.contains("<Text>JOHN walks into the office.</Text>"));
    }

    #[test]
    fn test_export_character() {
        let elements = vec![Element::new("1", ElementType::Character, "JOHN")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Character">"#));
        assert!(result.contains("<Text>JOHN</Text>"));
    }

    #[test]
    fn test_export_character_with_contd() {
        let mut element = Element::new("1", ElementType::Character, "JOHN");
        element.auto_contd = true;
        let elements = vec![element];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Character">"#));
        assert!(result.contains("<Text>JOHN (CONT'D)</Text>"));
    }

    #[test]
    fn test_export_dialogue() {
        let elements = vec![Element::new(
            "1",
            ElementType::Dialogue,
            "Hello, is anyone here?",
        )];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Dialogue">"#));
        assert!(result.contains("<Text>Hello, is anyone here?</Text>"));
    }

    #[test]
    fn test_export_parenthetical() {
        let elements = vec![Element::new("1", ElementType::Parenthetical, "(beat)")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Parenthetical">"#));
        assert!(result.contains("<Text>(beat)</Text>"));
    }

    #[test]
    fn test_export_transition() {
        let elements = vec![Element::new("1", ElementType::Transition, "FADE OUT.")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Transition">"#));
        assert!(result.contains("<Text>FADE OUT.</Text>"));
    }

    #[test]
    fn test_export_shot() {
        let elements = vec![Element::new("1", ElementType::Shot, "ANGLE ON - John's face")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Shot">"#));
        assert!(result.contains("<Text>ANGLE ON - John&apos;s face</Text>"));
    }

    #[test]
    fn test_escape_xml_special_characters() {
        let elements = vec![Element::new(
            "1",
            ElementType::Dialogue,
            "He said \"Hello\" & she replied <nothing>",
        )];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains("He said &quot;Hello&quot; &amp; she replied &lt;nothing&gt;"));
    }

    #[test]
    fn test_escape_xml_apostrophe() {
        let result = escape_xml("John's car");
        assert_eq!(result, "John&apos;s car");
    }

    #[test]
    fn test_escape_xml_all_characters() {
        let result = escape_xml("&<>\"'");
        assert_eq!(result, "&amp;&lt;&gt;&quot;&apos;");
    }

    #[test]
    fn test_export_title_page() {
        let elements: Vec<Element> = vec![];
        let metadata = DocumentMetadata::new()
            .title("My Screenplay")
            .author("John Smith")
            .draft("First Draft");

        let result = export_to_fdx(&elements, Some(&metadata));

        assert!(result.contains("<TitlePage>"));
        assert!(result.contains(r#"<Paragraph Type="Title">"#));
        assert!(result.contains("<Text>My Screenplay</Text>"));
        assert!(result.contains(r#"<Paragraph Type="Author">"#));
        assert!(result.contains("<Text>Written by</Text>"));
        assert!(result.contains("<Text>John Smith</Text>"));
        assert!(result.contains(r#"<Paragraph Type="Draft">"#));
        assert!(result.contains("<Text>First Draft</Text>"));
        assert!(result.contains("</TitlePage>"));
    }

    #[test]
    fn test_export_title_page_with_all_fields() {
        let elements: Vec<Element> = vec![];
        let metadata = DocumentMetadata::new()
            .title("Test Script")
            .author("Jane Writer")
            .draft("Second Draft")
            .date("December 2025")
            .contact("jane@example.com\n555-1234")
            .copyright("Copyright 2025 Jane Writer")
            .notes("Based on a true story");

        let result = export_to_fdx(&elements, Some(&metadata));

        assert!(result.contains("<TitlePage>"));
        assert!(result.contains("<Text>Test Script</Text>"));
        assert!(result.contains("<Text>Jane Writer</Text>"));
        assert!(result.contains("<Text>Second Draft</Text>"));
        assert!(result.contains("<Text>December 2025</Text>"));
        assert!(result.contains("<Text>jane@example.com</Text>"));
        assert!(result.contains("<Text>555-1234</Text>"));
        assert!(result.contains("<Text>Copyright 2025 Jane Writer</Text>"));
        assert!(result.contains("<Text>Based on a true story</Text>"));
    }

    #[test]
    fn test_export_empty_metadata_no_title_page() {
        let elements = vec![Element::new(
            "1",
            ElementType::SceneHeading,
            "INT. OFFICE - DAY",
        )];
        let metadata = DocumentMetadata::default();

        let result = export_to_fdx(&elements, Some(&metadata));

        // Empty metadata should not produce title page
        assert!(!result.contains("<TitlePage>"));
    }

    #[test]
    fn test_export_dual_dialogue() {
        let elements = vec![
            Element::new("1", ElementType::DualDialogueLeft, "JOHN"),
            Element::new("2", ElementType::Dialogue, "I agree!"),
            Element::new("3", ElementType::DualDialogueRight, "SARAH"),
            Element::new("4", ElementType::Dialogue, "Me too!"),
        ];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"<Paragraph Type="Character" DualDialogue="Yes">"#));
        assert!(result.contains("<Text>JOHN</Text>"));
        assert!(result.contains("<Text>SARAH</Text>"));
    }

    #[test]
    fn test_export_full_scene() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            Element::new("2", ElementType::Action, "JOHN walks into the office."),
            Element::new("3", ElementType::Character, "JOHN"),
            Element::new("4", ElementType::Dialogue, "Hello, is anyone here?"),
            Element::new("5", ElementType::Character, "SARAH"),
            Element::new("6", ElementType::Parenthetical, "(from behind a desk)"),
            Element::new("7", ElementType::Dialogue, "Over here!"),
            Element::new("8", ElementType::Transition, "FADE OUT."),
        ];

        let metadata = DocumentMetadata::new()
            .title("Test Script")
            .author("Test Author");

        let result = export_to_fdx(&elements, Some(&metadata));

        // Verify structure is well-formed
        assert!(result.starts_with(r#"<?xml version="1.0" encoding="UTF-8"?>"#));
        assert!(result.contains("<Content>"));
        assert!(result.contains("</Content>"));
        assert!(result.contains("<TitlePage>"));
        assert!(result.contains("</TitlePage>"));
        assert!(result.ends_with("</FinalDraft>\n"));

        // Verify content order
        let scene_pos = result.find("INT. OFFICE - DAY").unwrap();
        let john_walks_pos = result.find("JOHN walks into").unwrap();
        let fade_out_pos = result.find("FADE OUT.").unwrap();

        assert!(scene_pos < john_walks_pos);
        assert!(john_walks_pos < fade_out_pos);
    }

    #[test]
    fn test_element_type_mapping() {
        assert_eq!(element_type_to_fdx(ElementType::SceneHeading), "Scene Heading");
        assert_eq!(element_type_to_fdx(ElementType::Action), "Action");
        assert_eq!(element_type_to_fdx(ElementType::Character), "Character");
        assert_eq!(element_type_to_fdx(ElementType::Dialogue), "Dialogue");
        assert_eq!(element_type_to_fdx(ElementType::Parenthetical), "Parenthetical");
        assert_eq!(element_type_to_fdx(ElementType::Transition), "Transition");
        assert_eq!(element_type_to_fdx(ElementType::Shot), "Shot");
        // Fallback types
        assert_eq!(element_type_to_fdx(ElementType::Super), "Action");
        assert_eq!(element_type_to_fdx(ElementType::Chyron), "Action");
        assert_eq!(element_type_to_fdx(ElementType::Flashback), "Scene Heading");
        assert_eq!(element_type_to_fdx(ElementType::Montage), "Scene Heading");
        assert_eq!(element_type_to_fdx(ElementType::Intercut), "Scene Heading");
        assert_eq!(element_type_to_fdx(ElementType::ActBreak), "Action");
        assert_eq!(element_type_to_fdx(ElementType::PageBreak), "Action");
        assert_eq!(element_type_to_fdx(ElementType::BlankLine), "Action");
    }

    #[test]
    fn test_scene_modifiers_as_scene_headings() {
        let elements = vec![
            Element::new("1", ElementType::Flashback, "FLASHBACK - INT. HOUSE - NIGHT"),
            Element::new("2", ElementType::Montage, "MONTAGE:"),
            Element::new("3", ElementType::Intercut, "INTERCUT WITH:"),
        ];

        let result = export_to_fdx(&elements, None);

        // All should be Scene Heading type
        let count = result.matches(r#"Type="Scene Heading""#).count();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_centered_elements_as_action() {
        let elements = vec![
            Element::new("1", ElementType::Super, "New York City, 1985"),
            Element::new("2", ElementType::Chyron, "Three months later"),
        ];

        let result = export_to_fdx(&elements, None);

        // Both should be Action type
        let count = result.matches(r#"Type="Action""#).count();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_act_break_as_action() {
        let elements = vec![Element::new("1", ElementType::ActBreak, "END OF ACT ONE")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"Type="Action""#));
        assert!(result.contains("<Text>END OF ACT ONE</Text>"));
    }

    #[test]
    fn test_blank_line_as_action() {
        let elements = vec![Element::new("1", ElementType::BlankLine, "")];

        let result = export_to_fdx(&elements, None);

        assert!(result.contains(r#"Type="Action""#));
        assert!(result.contains("<Text></Text>"));
    }

    #[test]
    fn test_xml_structure_valid() {
        let elements = vec![
            Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
            Element::new("2", ElementType::Action, "A test."),
        ];

        let result = export_to_fdx(&elements, None);

        // Count opening and closing tags
        let open_paragraph = result.matches("<Paragraph").count();
        let close_paragraph = result.matches("</Paragraph>").count();
        assert_eq!(open_paragraph, close_paragraph);

        let open_text = result.matches("<Text>").count();
        let close_text = result.matches("</Text>").count();
        assert_eq!(open_text, close_text);
    }

    #[test]
    fn test_metadata_with_special_characters() {
        let metadata = DocumentMetadata::new()
            .title("John's \"Big\" Script")
            .author("Smith & Jones")
            .notes("<Draft> notes");

        let result = export_to_fdx(&[], Some(&metadata));

        assert!(result.contains("John&apos;s &quot;Big&quot; Script"));
        assert!(result.contains("Smith &amp; Jones"));
        assert!(result.contains("&lt;Draft&gt; notes"));
    }
}
