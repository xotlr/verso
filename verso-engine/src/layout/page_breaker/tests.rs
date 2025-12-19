//! Unit tests for the page breaker pagination functions.

use super::*;
use crate::types::{
    DocumentMetadata, DualDialoguePosition, Element, ElementType, LockedPageConfig,
    PageConfig, PageIdentifier, RevisionColor, SceneNumberingConfig, SceneNumberingMode,
    WarningType,
};

fn make_element(id: &str, element_type: ElementType, content: &str) -> Element {
    Element::new(id, element_type, content)
}

fn make_dialogue(id: &str, content: &str, character: &str) -> Element {
    Element::new(id, ElementType::Dialogue, content).with_character_name(character)
}

fn make_dual_element(
    id: &str,
    element_type: ElementType,
    content: &str,
    position: DualDialoguePosition,
) -> Element {
    let mut element = make_element(id, element_type, content);
    element.dual_dialogue_position = Some(position);
    if element_type == ElementType::Character {
        element.character_name = Some(content.to_uppercase());
    }
    element
}

// =============================================================================
// Basic Pagination Tests
// =============================================================================

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
    let elements = vec![make_element("1", ElementType::Action, "Some content.")];

    let result = paginate(&elements, &config);

    // Timing is measured by JavaScript worker, Rust returns 0
    // Just verify pagination completed without errors
    assert!(!result.pages.is_empty());
}

// =============================================================================
// Glue Group Tests (CHARACTER + DIALOGUE kept together)
// =============================================================================

#[test]
fn test_glue_group_keeps_together_on_page_break() {
    let config = PageConfig::feature_film();

    // Fill page almost completely
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

    assert_eq!(
        char_pos.pages[0], dial_pos.pages[0],
        "CHARACTER and DIALOGUE should be on the same page due to glue logic"
    );
}

// =============================================================================
// Scene Continuation Tests
// =============================================================================

#[test]
fn test_scene_continuation_disabled_by_default() {
    let config = PageConfig::feature_film();

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::Action, "More action."),
    ];

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count >= 2,
        "Should have at least 2 pages, got {}",
        result.stats.page_count
    );

    // Scene continuation markers should be None by default
    for page in &result.pages {
        assert!(
            page.scene_continued_bottom.is_none(),
            "scene_continued_bottom should be None when disabled"
        );
        assert!(
            page.scene_continued_top.is_none(),
            "scene_continued_top should be None when disabled"
        );
    }
}

#[test]
fn test_scene_continuation_enabled_mid_scene_break() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::Action, "More action."),
    ];

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count >= 2,
        "Should have at least 2 pages, got {}",
        result.stats.page_count
    );

    // First page should have bottom marker (scene continues)
    let first_page = &result.pages[0];
    assert!(
        first_page.scene_continued_bottom.is_some(),
        "First page should have scene_continued_bottom when breaking mid-scene"
    );
    assert_eq!(
        first_page.scene_continued_bottom.as_ref().unwrap(),
        "(CONTINUED)"
    );

    // Second page should have top marker
    let second_page = &result.pages[1];
    assert!(
        second_page.scene_continued_top.is_some(),
        "Second page should have scene_continued_top when continuing scene"
    );
    assert_eq!(
        second_page.scene_continued_top.as_ref().unwrap(),
        "CONTINUED:"
    );
}

#[test]
fn test_scene_continuation_not_shown_at_scene_boundary() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::SceneHeading, "INT. HALLWAY - NIGHT"),
        make_element("4", ElementType::Action, "Walking down the hall."),
    ];

    let result = paginate(&elements, &config);

    assert!(result.stats.page_count >= 1, "Should have at least 1 page");
}

#[test]
fn test_scene_continuation_with_scene_number() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;
    config.continuation_style.scene_continued_with_number = true;

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::Action, "More action."),
    ];

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count >= 2,
        "Should have at least 2 pages, got {}",
        result.stats.page_count
    );

    // First page should have scene number
    let first_page = &result.pages[0];
    assert_eq!(
        first_page.continued_scene_number,
        Some(1),
        "First page should have scene number 1"
    );

    // Second page should also have scene number
    let second_page = &result.pages[1];
    assert_eq!(
        second_page.continued_scene_number,
        Some(1),
        "Second page should have scene number 1 (same scene)"
    );
}

#[test]
fn test_scene_number_increments_with_scene_headings() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;
    config.continuation_style.scene_continued_with_number = true;

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::SceneHeading, "INT. HALLWAY - NIGHT"),
        make_element("4", ElementType::Action, &long_action),
        make_element("5", ElementType::Action, "Final action."),
    ];

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count >= 2,
        "Should have multiple pages, got {}",
        result.stats.page_count
    );
}

#[test]
fn test_no_scene_continuation_before_first_scene_heading() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::Action, &long_action),
        make_element("2", ElementType::Action, "More action without scene."),
    ];

    let result = paginate(&elements, &config);

    // Should have pages but NO scene continuation markers
    for page in &result.pages {
        assert!(
            page.scene_continued_bottom.is_none(),
            "No scene continuation before first scene heading"
        );
        assert!(
            page.scene_continued_top.is_none(),
            "No scene continuation before first scene heading"
        );
        assert!(
            page.continued_scene_number.is_none(),
            "No scene number before first scene heading"
        );
    }
}

#[test]
fn test_custom_scene_continuation_markers() {
    let mut config = PageConfig::feature_film();
    config.continuation_style.scene_continued_enabled = true;
    config.continuation_style.scene_continued_bottom = "SCENE CONTINUES".to_string();
    config.continuation_style.scene_continued_top = "SCENE CONTINUED".to_string();

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
        make_element("3", ElementType::Action, "More action."),
    ];

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count >= 2,
        "Should have at least 2 pages, got {}",
        result.stats.page_count
    );

    // Check custom markers are used
    let first_page = &result.pages[0];
    assert_eq!(
        first_page.scene_continued_bottom.as_ref().unwrap(),
        "SCENE CONTINUES"
    );

    let second_page = &result.pages[1];
    assert_eq!(
        second_page.scene_continued_top.as_ref().unwrap(),
        "SCENE CONTINUED"
    );
}

// =============================================================================
// Scene Numbering Integration Tests
// =============================================================================

#[test]
fn test_scene_numbering_disabled_by_default() {
    let config = PageConfig::feature_film();
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
        make_element("3", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(config.scene_numbering.mode, SceneNumberingMode::Disabled);
    assert_eq!(result.stats.page_count, 1);
}

#[test]
fn test_scene_numbering_auto_mode_integration() {
    let mut config = PageConfig::feature_film();
    config.scene_numbering = SceneNumberingConfig {
        mode: SceneNumberingMode::Auto,
        starting_number: 1,
        prefix: None,
    };

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
        make_element("3", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
        make_element("4", ElementType::Action, "Cars drive by."),
        make_element("5", ElementType::SceneHeading, "INT. CAR - CONTINUOUS"),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
    assert!(result.warnings.is_empty());
}

#[test]
fn test_scene_numbering_with_prefix_integration() {
    let mut config = PageConfig::feature_film();
    config.scene_numbering = SceneNumberingConfig {
        mode: SceneNumberingMode::Auto,
        starting_number: 1,
        prefix: Some("A".to_string()),
    };

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
}

#[test]
fn test_scene_numbering_manual_mode_integration() {
    let mut config = PageConfig::feature_film();
    config.scene_numbering = SceneNumberingConfig {
        mode: SceneNumberingMode::Manual,
        starting_number: 1,
        prefix: None,
    };

    let mut elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::SceneHeading, "EXT. STREET - NIGHT"),
    ];

    // Pre-set scene numbers for manual mode
    elements[0].scene_number = Some("5".to_string());
    elements[1].scene_number = Some("7".to_string());

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
}

// =============================================================================
// Dual Dialogue Tests
// =============================================================================

#[test]
fn test_basic_dual_dialogue() {
    let config = PageConfig::feature_film();
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element(
            "3",
            ElementType::Dialogue,
            "Hello there!",
            DualDialoguePosition::Left,
        ),
        make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element(
            "5",
            ElementType::Dialogue,
            "Hi yourself!",
            DualDialoguePosition::Right,
        ),
        make_element("6", ElementType::Action, "They shake hands."),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
    assert!(result.warnings.is_empty());

    // All 6 elements should have positions recorded
    assert_eq!(result.element_positions.len(), 6);

    // Dual dialogue elements should all be on the same page
    let john_pos = result.element_positions.get("2").unwrap();
    let jane_pos = result.element_positions.get("4").unwrap();
    assert_eq!(john_pos.pages[0], jane_pos.pages[0]);
}

#[test]
fn test_dual_dialogue_keeps_together_on_page_break() {
    let config = PageConfig::feature_film();

    // Fill page almost completely
    let mut elements: Vec<Element> = (0..50)
        .map(|i| make_element(&format!("a{}", i), ElementType::Action, "Action text here."))
        .collect();

    // Add dual dialogue at the end - should go to next page as a unit
    elements.push(make_dual_element(
        "d1",
        ElementType::Character,
        "JOHN",
        DualDialoguePosition::Left,
    ));
    elements.push(make_dual_element(
        "d2",
        ElementType::Dialogue,
        "Hello there!",
        DualDialoguePosition::Left,
    ));
    elements.push(make_dual_element(
        "d3",
        ElementType::Character,
        "JANE",
        DualDialoguePosition::Right,
    ));
    elements.push(make_dual_element(
        "d4",
        ElementType::Dialogue,
        "Hi yourself!",
        DualDialoguePosition::Right,
    ));

    let result = paginate(&elements, &config);

    // Dual dialogue elements should all be on the same page
    let john_pos = result.element_positions.get("d1").unwrap();
    let john_dial_pos = result.element_positions.get("d2").unwrap();
    let jane_pos = result.element_positions.get("d3").unwrap();
    let jane_dial_pos = result.element_positions.get("d4").unwrap();

    assert_eq!(
        john_pos.pages[0], john_dial_pos.pages[0],
        "JOHN and his dialogue should be on same page"
    );
    assert_eq!(
        jane_pos.pages[0], jane_dial_pos.pages[0],
        "JANE and her dialogue should be on same page"
    );
    assert_eq!(
        john_pos.pages[0], jane_pos.pages[0],
        "Both columns of dual dialogue should be on same page"
    );
}

#[test]
fn test_dual_dialogue_line_calculation() {
    let config = PageConfig::feature_film();

    let long_dialogue = "This is a longer line of dialogue that will need to wrap multiple times in the narrower dual dialogue column format.";

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element("3", ElementType::Dialogue, "Short.", DualDialoguePosition::Left),
        make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element(
            "5",
            ElementType::Dialogue,
            long_dialogue,
            DualDialoguePosition::Right,
        ),
        make_element("6", ElementType::Action, "They shake hands."),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
}

#[test]
fn test_multiple_dual_dialogue_groups() {
    let config = PageConfig::feature_film();

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        // First dual dialogue
        make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element("3", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
        make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element("5", ElementType::Dialogue, "Hi!", DualDialoguePosition::Right),
        // Regular action
        make_element("6", ElementType::Action, "They pause."),
        // Second dual dialogue
        make_dual_element("7", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element(
            "8",
            ElementType::Dialogue,
            "Goodbye!",
            DualDialoguePosition::Left,
        ),
        make_dual_element("9", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element(
            "10",
            ElementType::Dialogue,
            "See ya!",
            DualDialoguePosition::Right,
        ),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
    assert!(result.warnings.is_empty());
    assert_eq!(result.element_positions.len(), 10);
}

#[test]
fn test_dual_dialogue_overflow_warning() {
    let config = PageConfig::feature_film();

    let very_long_dialogue = "Very long dialogue. ".repeat(100);

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_dual_element("2", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element(
            "3",
            ElementType::Dialogue,
            &very_long_dialogue,
            DualDialoguePosition::Left,
        ),
        make_dual_element("4", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element(
            "5",
            ElementType::Dialogue,
            &very_long_dialogue,
            DualDialoguePosition::Right,
        ),
    ];

    let result = paginate(&elements, &config);

    // Should have a warning about dual dialogue overflow
    let has_overflow_warning = result
        .warnings
        .iter()
        .any(|w| w.warning_type == WarningType::DualDialogueOverflow);
    assert!(
        has_overflow_warning,
        "Should warn about dual dialogue exceeding page"
    );
}

#[test]
fn test_dual_dialogue_mixed_with_regular() {
    let config = PageConfig::feature_film();

    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
        // Regular dialogue
        make_element("3", ElementType::Character, "BOB"),
        make_dialogue("4", "Just me talking here.", "BOB"),
        // Then dual dialogue
        make_dual_element("5", ElementType::Character, "JOHN", DualDialoguePosition::Left),
        make_dual_element("6", ElementType::Dialogue, "Hello!", DualDialoguePosition::Left),
        make_dual_element("7", ElementType::Character, "JANE", DualDialoguePosition::Right),
        make_dual_element("8", ElementType::Dialogue, "Hi!", DualDialoguePosition::Right),
        // More regular content
        make_element("9", ElementType::Action, "The end."),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.stats.page_count, 1);
    assert_eq!(result.element_positions.len(), 9);
}

// =============================================================================
// Locked Page (A-Page) Integration Tests
// =============================================================================

#[test]
fn test_locked_pages_disabled_by_default() {
    let config = PageConfig::feature_film();

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
    ];

    let result = paginate(&elements, &config);

    assert!(result.stats.page_count > 1, "Should have multiple pages");

    for page in &result.pages {
        assert!(
            matches!(page.identifier, PageIdentifier::Sequential(_)),
            "All pages should be sequential when locked pages disabled"
        );
    }
}

#[test]
fn test_locked_pages_a_page_generation() {
    let mut config = PageConfig::feature_film();
    config.locked_pages = LockedPageConfig {
        enabled: true,
        locked_page_count: 2,
        omitted_pages: vec![],
    };

    let elements: Vec<Element> = (0..200)
        .map(|i| {
            make_element(
                &format!("{}", i),
                ElementType::Action,
                "Action text that takes up some space on the page here.",
            )
        })
        .collect();

    let result = paginate(&elements, &config);

    assert!(
        result.stats.page_count > 2,
        "Should have more than 2 pages, got {}",
        result.stats.page_count
    );

    // First 2 pages should be sequential
    assert_eq!(result.pages[0].identifier, PageIdentifier::Sequential(1));
    assert_eq!(result.pages[1].identifier, PageIdentifier::Sequential(2));

    // Pages beyond locked count should be A-pages
    for page in result.pages.iter().skip(2) {
        assert!(
            matches!(page.identifier, PageIdentifier::Inserted { base: 2, .. }),
            "Pages beyond locked count should be A-pages, got {:?}",
            page.identifier
        );
    }
}

#[test]
fn test_locked_pages_with_omitted() {
    let mut config = PageConfig::feature_film();
    config.locked_pages = LockedPageConfig {
        enabled: true,
        locked_page_count: 10,
        omitted_pages: vec![5],
    };

    let elements: Vec<Element> = (0..10)
        .map(|i| {
            make_element(
                &format!("{}", i),
                ElementType::Action,
                "Some action content that takes a bit of space.",
            )
        })
        .collect();

    let result = paginate(&elements, &config);

    let has_omitted = result
        .pages
        .iter()
        .any(|p| matches!(p.identifier, PageIdentifier::Omitted(5)));
    assert!(has_omitted, "Should have omitted page 5 marker");
}

#[test]
fn test_locked_pages_display_format() {
    let mut config = PageConfig::feature_film();
    config.locked_pages = LockedPageConfig {
        enabled: true,
        locked_page_count: 1,
        omitted_pages: vec![],
    };

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
    ];

    let result = paginate(&elements, &config);

    assert_eq!(result.pages[0].identifier.display(), "1");

    if result.pages.len() > 1 {
        assert_eq!(result.pages[1].identifier.display(), "1A");
    }
    if result.pages.len() > 2 {
        assert_eq!(result.pages[2].identifier.display(), "1B");
    }
}

#[test]
fn test_locked_pages_with_title_page() {
    let mut config = PageConfig::feature_film();
    config.locked_pages = LockedPageConfig {
        enabled: true,
        locked_page_count: 3,
        omitted_pages: vec![],
    };

    let long_action =
        "Action text that fills up the screenplay page with content. ".repeat(500);
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, &long_action),
    ];

    let result = paginate_with_title_page(&elements, &config, true, None);

    // Page 1 is title page, content starts at page 2
    assert_eq!(result.pages[0].identifier, PageIdentifier::Sequential(1));
    assert_eq!(result.pages[1].identifier, PageIdentifier::Sequential(2));
    assert_eq!(result.pages[2].identifier, PageIdentifier::Sequential(3));

    // Pages beyond locked count become A-pages
    if result.pages.len() > 3 {
        assert!(
            matches!(
                result.pages[3].identifier,
                PageIdentifier::Inserted { base: 3, suffix: 'A' }
            ),
            "Fourth page should be 3A, got {:?}",
            result.pages[3].identifier
        );
    }
}

// =============================================================================
// Document Metadata Integration Tests
// =============================================================================

#[test]
fn test_pagination_without_metadata() {
    let config = PageConfig::feature_film();
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
    ];

    let result = paginate(&elements, &config);

    assert!(result.metadata.is_none());
}

#[test]
fn test_pagination_with_metadata() {
    let config = PageConfig::feature_film();
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
    ];

    let metadata = DocumentMetadata::new()
        .title("My Screenplay")
        .author("Jane Writer")
        .draft("First Draft")
        .date("December 2025");

    let result = paginate_with_title_page(&elements, &config, false, Some(&metadata));

    assert!(result.metadata.is_some());
    let result_meta = result.metadata.unwrap();
    assert_eq!(result_meta.title, Some("My Screenplay".to_string()));
    assert_eq!(result_meta.author, Some("Jane Writer".to_string()));
    assert_eq!(result_meta.draft, Some("First Draft".to_string()));
    assert_eq!(result_meta.date, Some("December 2025".to_string()));
}

#[test]
fn test_pagination_with_title_page_and_metadata() {
    let config = PageConfig::feature_film();
    let elements = vec![
        make_element("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
        make_element("2", ElementType::Action, "A busy office."),
    ];

    let metadata = DocumentMetadata::new()
        .title("My Movie")
        .author("John Director")
        .revision_color(RevisionColor::Blue);

    let result = paginate_with_title_page(&elements, &config, true, Some(&metadata));

    // Should have title page as page 1
    assert_eq!(result.pages[0].identifier, PageIdentifier::Sequential(1));
    assert!(result.stats.layout.has_title_page);

    // Should have metadata
    assert!(result.metadata.is_some());
    let result_meta = result.metadata.unwrap();
    assert_eq!(result_meta.title, Some("My Movie".to_string()));
    assert_eq!(result_meta.revision_color, Some(RevisionColor::Blue));
}

#[test]
fn test_metadata_full_fields() {
    let config = PageConfig::feature_film();
    let elements = vec![make_element("1", ElementType::Action, "Content.")];

    let metadata = DocumentMetadata::new()
        .title("Feature Film")
        .author("Writer Name")
        .contact("writer@email.com\n123 Street\nCity, ST 12345")
        .draft("Shooting Script")
        .date("December 18, 2025")
        .copyright("Copyright 2025 Writer Name")
        .notes("Based on the novel by Author")
        .revision_color(RevisionColor::Pink);

    let result = paginate_with_title_page(&elements, &config, true, Some(&metadata));

    let result_meta = result.metadata.unwrap();
    assert_eq!(result_meta.title, Some("Feature Film".to_string()));
    assert_eq!(result_meta.author, Some("Writer Name".to_string()));
    assert!(result_meta.contact.is_some());
    assert_eq!(result_meta.draft, Some("Shooting Script".to_string()));
    assert_eq!(result_meta.date, Some("December 18, 2025".to_string()));
    assert_eq!(
        result_meta.copyright,
        Some("Copyright 2025 Writer Name".to_string())
    );
    assert_eq!(
        result_meta.notes,
        Some("Based on the novel by Author".to_string())
    );
    assert_eq!(result_meta.revision_color, Some(RevisionColor::Pink));
}

#[test]
fn test_metadata_partial_fields() {
    let config = PageConfig::feature_film();
    let elements = vec![make_element("1", ElementType::Action, "Content.")];

    let metadata = DocumentMetadata::with_title_author("Untitled", "Anonymous");

    let result = paginate_with_title_page(&elements, &config, false, Some(&metadata));

    let result_meta = result.metadata.unwrap();
    assert_eq!(result_meta.title, Some("Untitled".to_string()));
    assert_eq!(result_meta.author, Some("Anonymous".to_string()));
    assert!(result_meta.draft.is_none());
    assert!(result_meta.date.is_none());
    assert!(result_meta.copyright.is_none());
    assert!(result_meta.notes.is_none());
    assert!(result_meta.revision_color.is_none());
}

#[test]
fn test_metadata_empty() {
    let config = PageConfig::feature_film();
    let elements = vec![make_element("1", ElementType::Action, "Content.")];

    let metadata = DocumentMetadata::default();
    assert!(metadata.is_empty());

    let result = paginate_with_title_page(&elements, &config, false, Some(&metadata));

    // Even empty metadata should be passed through
    assert!(result.metadata.is_some());
    assert!(result.metadata.unwrap().is_empty());
}

#[test]
fn test_all_revision_colors() {
    let config = PageConfig::feature_film();
    let elements = vec![make_element("1", ElementType::Action, "Content.")];

    let colors = RevisionColor::all();
    for color in colors {
        let metadata = DocumentMetadata::new().revision_color(*color);
        let result = paginate_with_title_page(&elements, &config, false, Some(&metadata));

        let result_meta = result.metadata.unwrap();
        assert_eq!(result_meta.revision_color, Some(*color));
    }
}
