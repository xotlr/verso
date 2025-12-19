use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::ElementType;

// ============================================================================
// Scene Numbering Types
// ============================================================================

/// Scene numbering mode - determines how scene numbers are assigned
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum SceneNumberingMode {
    /// No scene numbers (spec scripts) - DEFAULT
    #[default]
    Disabled,
    /// Auto-generate sequential numbers starting from starting_number
    Auto,
    /// Use numbers from element data (manual assignment)
    Manual,
    /// Preserve existing numbers, handle A-pages (47A, 47B) - for locked scripts
    Locked,
}

// ============================================================================
// Locked Page (A-Page) Configuration
// ============================================================================

/// Configuration for locked page numbering (production script mode).
///
/// In production/shooting scripts, page numbers are "locked" after a certain point.
/// When content is added that would push to a new page, instead of renumbering
/// all subsequent pages, "A-pages" are inserted (e.g., 47A, 47B).
/// When pages are removed, they become "OMITTED" markers.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LockedPageConfig {
    /// Whether page locking is enabled (production script mode).
    /// When false, normal sequential page numbering is used.
    #[serde(default)]
    pub enabled: bool,

    /// The locked page count - pages beyond this get A-page suffixes.
    /// For example, if locked_page_count is 100 and pagination produces 102 pages,
    /// the extra pages become 100A and 100B instead of 101 and 102.
    #[serde(default)]
    pub locked_page_count: u32,

    /// Omitted page numbers (pages that existed but content was removed).
    /// These will be represented as "N OMITTED" markers in the output.
    #[serde(default)]
    pub omitted_pages: Vec<u32>,
}

/// Configuration for scene numbering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneNumberingConfig {
    /// How scene numbers are assigned
    pub mode: SceneNumberingMode,
    /// Starting number for auto-generation (for series continuation)
    pub starting_number: u32,
    /// Optional prefix for scene numbers (e.g., "A" for episode A -> "A1", "A2")
    pub prefix: Option<String>,
}

impl Default for SceneNumberingConfig {
    fn default() -> Self {
        Self {
            mode: SceneNumberingMode::Disabled,
            starting_number: 1,
            prefix: None,
        }
    }
}

/// Paper size definitions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaperSize {
    UsLetter,  // 8.5" x 11"
    A4,        // 210mm x 297mm
}

impl Default for PaperSize {
    fn default() -> Self {
        Self::UsLetter
    }
}

impl PaperSize {
    /// Width in points (1 inch = 72 points)
    pub fn width_pt(&self) -> f64 {
        match self {
            PaperSize::UsLetter => 612.0,  // 8.5 * 72
            PaperSize::A4 => 595.28,       // 210mm in points
        }
    }

    /// Height in points
    pub fn height_pt(&self) -> f64 {
        match self {
            PaperSize::UsLetter => 792.0,  // 11 * 72
            PaperSize::A4 => 841.89,       // 297mm in points
        }
    }
}

/// Margin configuration in inches
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MarginConfig {
    pub top: f64,
    pub bottom: f64,
    pub left: f64,
    pub right: f64,
}

impl Default for MarginConfig {
    fn default() -> Self {
        Self {
            top: 1.0,
            bottom: 0.5,  // Final Draft uses 0.5" bottom for max usable lines
            left: 1.5,
            right: 1.0,
        }
    }
}

impl MarginConfig {
    pub fn top_pt(&self) -> f64 { self.top * 72.0 }
    pub fn bottom_pt(&self) -> f64 { self.bottom * 72.0 }
    pub fn left_pt(&self) -> f64 { self.left * 72.0 }
    pub fn right_pt(&self) -> f64 { self.right * 72.0 }
}

/// Style configuration for each element type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementStyle {
    /// Left margin from page's printable area in inches
    pub margin_left: f64,

    /// Right margin from page's printable area in inches
    pub margin_right: f64,

    /// Maximum characters per line
    pub max_chars_per_line: u8,

    /// Blank lines before this element type
    pub space_before: u8,

    /// Blank lines after this element type
    pub space_after: u8,

    /// Line spacing multiplier (1.0 = single, 2.0 = double)
    pub line_spacing: f64,

    /// Whether this element can be split across pages
    pub can_split: bool,

    /// Minimum lines that must remain together when splitting
    pub min_lines_before_split: u8,

    /// Minimum lines that must appear on new page after split
    pub min_lines_after_split: u8,

    /// Must keep with following element
    pub keep_with_next: bool,

    /// Number of following lines required if keep_with_next is true
    pub keep_with_next_lines: u8,

    /// Force uppercase for this element
    pub force_uppercase: bool,
}

impl Default for ElementStyle {
    fn default() -> Self {
        Self {
            margin_left: 0.0,
            margin_right: 0.0,
            max_chars_per_line: 60,
            space_before: 1,
            space_after: 0,
            line_spacing: 1.0,
            can_split: true,
            min_lines_before_split: 2,
            min_lines_after_split: 2,
            keep_with_next: false,
            keep_with_next_lines: 0,
            force_uppercase: false,
        }
    }
}

impl ElementStyle {
    /// Create a default style for a specific element type
    pub fn default_for(element_type: ElementType) -> Self {
        match element_type {
            ElementType::SceneHeading => Self {
                max_chars_per_line: 60,  // Final Draft standard: 6" × 10 CPI
                space_before: 2,
                keep_with_next: true,
                keep_with_next_lines: 2,  // Orphan prevention: heading + at least 1 line
                force_uppercase: true,
                can_split: false,
                ..Self::default()
            },

            ElementType::Action => Self {
                max_chars_per_line: 60,  // Final Draft standard: 6" × 10 CPI
                space_before: 1,
                can_split: true,
                min_lines_before_split: 2,
                min_lines_after_split: 2,
                ..Self::default()
            },

            ElementType::Character => Self {
                margin_left: 2.2,  // ~3.7" from page left with 1.5" page margin
                max_chars_per_line: 37,  // Match JS: FORMATTING_RULES.CHARACTER.maxCharsPerLine
                space_before: 1,
                force_uppercase: true,
                keep_with_next: true,
                keep_with_next_lines: 2,
                can_split: false,
                ..Self::default()
            },

            ElementType::Dialogue => Self {
                margin_left: 1.0,   // 2.5" from page left
                margin_right: 1.5,  // 2.5" from page right
                max_chars_per_line: 35,
                space_before: 0,
                can_split: true,
                min_lines_before_split: 2,
                min_lines_after_split: 2,
                ..Self::default()
            },

            ElementType::Parenthetical => Self {
                margin_left: 1.5,   // Match JS: 1.5" from printable area
                margin_right: 2.3,  // 2.9" from page right
                max_chars_per_line: 25,
                space_before: 0,
                can_split: false,
                keep_with_next: true,
                keep_with_next_lines: 1,
                ..Self::default()
            },

            ElementType::Transition => Self {
                margin_left: 4.0,  // Right-aligned
                max_chars_per_line: 16,  // Match JS: FORMATTING_RULES.TRANSITION.maxCharsPerLine
                space_before: 2,
                space_after: 0,  // Match Google AI reference: no bottom margin
                force_uppercase: true,
                can_split: false,
                ..Self::default()
            },

            ElementType::ActBreak => Self {
                space_before: 4,
                space_after: 0,  // Match Google AI reference: no bottom margin
                force_uppercase: true,
                can_split: false,
                ..Self::default()
            },

            ElementType::PageBreak => Self {
                space_before: 0,
                space_after: 0,
                can_split: false,
                ..Self::default()
            },

            _ => Self::default(),
        }
    }
}

/// How dialogue continuation markers are formatted
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContinuationStyle {
    /// Marker at bottom of page (e.g., "(MORE)")
    pub more_marker: String,

    /// Suffix added to character name on next page (e.g., "(CONT'D)")
    pub contd_marker: String,

    /// Whether to use continuation markers at all
    pub enabled: bool,

    // --- Scene-level continuation markers (shooting script feature) ---

    /// Whether to show scene continuation markers when a page breaks mid-scene
    /// Default: false (typically enabled only for shooting scripts)
    #[serde(default)]
    pub scene_continued_enabled: bool,

    /// Marker at bottom of page when scene continues (e.g., "(CONTINUED)")
    #[serde(default = "default_scene_continued_bottom")]
    pub scene_continued_bottom: String,

    /// Marker at top of next page when scene continues (e.g., "CONTINUED:")
    #[serde(default = "default_scene_continued_top")]
    pub scene_continued_top: String,

    /// Whether to include scene number in continuation markers (e.g., "CONTINUED: (42)")
    #[serde(default)]
    pub scene_continued_with_number: bool,

    // --- Character CONT'D (same speaker after intervening action) ---

    /// Whether to auto-detect when the same character speaks after intervening action
    /// and set auto_contd = true on the Character element.
    /// Default: true (standard screenplay convention)
    #[serde(default = "default_auto_contd_enabled")]
    pub auto_contd_enabled: bool,
}

fn default_scene_continued_bottom() -> String {
    "(CONTINUED)".to_string()
}

fn default_scene_continued_top() -> String {
    "CONTINUED:".to_string()
}

fn default_auto_contd_enabled() -> bool {
    true
}

impl Default for ContinuationStyle {
    fn default() -> Self {
        Self {
            more_marker: "(MORE)".to_string(),
            contd_marker: "(CONT'D)".to_string(),
            enabled: true,
            scene_continued_enabled: false,
            scene_continued_bottom: default_scene_continued_bottom(),
            scene_continued_top: default_scene_continued_top(),
            scene_continued_with_number: false,
            auto_contd_enabled: default_auto_contd_enabled(),
        }
    }
}

/// Orphan/widow control settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrphanControlConfig {
    /// Scene heading must have at least N lines after it on same page
    pub scene_heading_min_following: u8,

    /// Character name must have at least N dialogue lines on same page
    pub character_min_dialogue_lines: u8,

    /// Minimum dialogue lines before a split
    pub dialogue_min_before_split: u8,

    /// Minimum dialogue lines after a split
    pub dialogue_min_after_split: u8,
}

impl Default for OrphanControlConfig {
    fn default() -> Self {
        Self {
            scene_heading_min_following: 2,
            character_min_dialogue_lines: 2,
            dialogue_min_before_split: 2,
            dialogue_min_after_split: 2,
        }
    }
}

/// Complete page configuration - ALL format variations expressed here
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageConfig {
    pub paper_size: PaperSize,

    /// Lines per page (Final Draft standard: 54-55 for US Letter with Courier 12pt)
    pub lines_per_page: u8,

    /// Character width in points (Courier 12pt = 7.2pt)
    pub char_width_pt: f64,

    /// Line height in points (Courier 12pt = 12pt)
    pub line_height_pt: f64,

    /// Page margins
    pub margins: MarginConfig,

    /// Styles for each element type
    pub element_styles: HashMap<ElementType, ElementStyle>,

    /// Dialogue continuation configuration
    pub continuation_style: ContinuationStyle,

    /// Orphan/widow control settings
    pub orphan_control: OrphanControlConfig,

    /// Scene numbering configuration (production scripts)
    #[serde(default)]
    pub scene_numbering: SceneNumberingConfig,

    /// Dual dialogue column width in characters.
    /// Each column in dual dialogue is roughly half the normal dialogue width.
    /// Default: 17 characters (normal dialogue is 35 chars).
    #[serde(default)]
    pub dual_dialogue_column_width: Option<u8>,

    /// Locked page configuration (production script mode for A-pages).
    /// When enabled, pages beyond locked_page_count get A-page suffixes.
    #[serde(default)]
    pub locked_pages: LockedPageConfig,
}

impl Default for PageConfig {
    fn default() -> Self {
        Self::feature_film()
    }
}

impl PageConfig {
    /// Standard US Feature Film format
    pub fn feature_film() -> Self {
        let mut element_styles = HashMap::new();

        element_styles.insert(ElementType::SceneHeading, ElementStyle::default_for(ElementType::SceneHeading));
        element_styles.insert(ElementType::Action, ElementStyle::default_for(ElementType::Action));
        element_styles.insert(ElementType::Character, ElementStyle::default_for(ElementType::Character));
        element_styles.insert(ElementType::Dialogue, ElementStyle::default_for(ElementType::Dialogue));
        element_styles.insert(ElementType::Parenthetical, ElementStyle::default_for(ElementType::Parenthetical));
        element_styles.insert(ElementType::Transition, ElementStyle::default_for(ElementType::Transition));
        element_styles.insert(ElementType::ActBreak, ElementStyle::default_for(ElementType::ActBreak));
        element_styles.insert(ElementType::PageBreak, ElementStyle::default_for(ElementType::PageBreak));
        element_styles.insert(ElementType::Shot, ElementStyle::default_for(ElementType::Shot));
        element_styles.insert(ElementType::BlankLine, ElementStyle::default_for(ElementType::BlankLine));

        Self {
            paper_size: PaperSize::UsLetter,
            lines_per_page: 55,  // Final Draft standard: 9" × 6 LPI = 54-55 lines
            char_width_pt: 7.2,
            line_height_pt: 12.0,
            margins: MarginConfig::default(),
            element_styles,
            continuation_style: ContinuationStyle::default(),
            orphan_control: OrphanControlConfig::default(),
            scene_numbering: SceneNumberingConfig::default(),
            dual_dialogue_column_width: None, // Uses default (17 chars)
            locked_pages: LockedPageConfig::default(),
        }
    }

    /// TV One-Hour Drama format (industry standard)
    /// Used for: Hour-long dramas, procedurals, serialized shows
    /// Differences from film: Slightly fewer lines per page (53 vs 55)
    pub fn tv_one_hour() -> Self {
        let mut element_styles = HashMap::new();

        element_styles.insert(ElementType::SceneHeading, ElementStyle::default_for(ElementType::SceneHeading));
        element_styles.insert(ElementType::Action, ElementStyle::default_for(ElementType::Action));
        element_styles.insert(ElementType::Character, ElementStyle::default_for(ElementType::Character));
        element_styles.insert(ElementType::Dialogue, ElementStyle::default_for(ElementType::Dialogue));
        element_styles.insert(ElementType::Parenthetical, ElementStyle::default_for(ElementType::Parenthetical));
        element_styles.insert(ElementType::Transition, ElementStyle::default_for(ElementType::Transition));
        element_styles.insert(ElementType::ActBreak, ElementStyle::default_for(ElementType::ActBreak));
        element_styles.insert(ElementType::PageBreak, ElementStyle::default_for(ElementType::PageBreak));
        element_styles.insert(ElementType::Shot, ElementStyle::default_for(ElementType::Shot));
        element_styles.insert(ElementType::BlankLine, ElementStyle::default_for(ElementType::BlankLine));

        Self {
            paper_size: PaperSize::UsLetter,
            lines_per_page: 53,  // TV standard: slightly fewer than film
            char_width_pt: 7.2,
            line_height_pt: 12.0,
            margins: MarginConfig::default(),
            element_styles,
            continuation_style: ContinuationStyle::default(),
            orphan_control: OrphanControlConfig::default(),
            scene_numbering: SceneNumberingConfig::default(),
            dual_dialogue_column_width: None, // Uses default (17 chars)
            locked_pages: LockedPageConfig::default(),
        }
    }

    /// TV Half-Hour Comedy format (single-camera)
    /// Used for: 30-minute single-cam comedies
    /// Same as one-hour format (single-spaced, same margins)
    pub fn tv_half_hour() -> Self {
        Self::tv_one_hour()  // Identical format to one-hour
    }

    /// TV Multi-Camera Sitcom format
    /// Used for: Multi-cam sitcoms (taped before live audience)
    /// Key difference: DOUBLE-SPACED DIALOGUE for easier reading by actors
    pub fn tv_multi_cam() -> Self {
        let mut element_styles = HashMap::new();

        element_styles.insert(ElementType::SceneHeading, ElementStyle::default_for(ElementType::SceneHeading));
        element_styles.insert(ElementType::Action, ElementStyle::default_for(ElementType::Action));
        element_styles.insert(ElementType::Character, ElementStyle::default_for(ElementType::Character));

        // DIALOGUE: Double-spaced for multi-cam
        let mut dialogue_style = ElementStyle::default_for(ElementType::Dialogue);
        dialogue_style.line_spacing = 2.0;  // Double-spaced (key difference)
        element_styles.insert(ElementType::Dialogue, dialogue_style);

        // PARENTHETICAL: Also double-spaced to maintain spacing
        let mut paren_style = ElementStyle::default_for(ElementType::Parenthetical);
        paren_style.line_spacing = 2.0;
        element_styles.insert(ElementType::Parenthetical, paren_style);

        element_styles.insert(ElementType::Transition, ElementStyle::default_for(ElementType::Transition));
        element_styles.insert(ElementType::ActBreak, ElementStyle::default_for(ElementType::ActBreak));
        element_styles.insert(ElementType::PageBreak, ElementStyle::default_for(ElementType::PageBreak));
        element_styles.insert(ElementType::Shot, ElementStyle::default_for(ElementType::Shot));
        element_styles.insert(ElementType::BlankLine, ElementStyle::default_for(ElementType::BlankLine));

        Self {
            paper_size: PaperSize::UsLetter,
            lines_per_page: 53,  // Same as other TV formats
            char_width_pt: 7.2,
            line_height_pt: 12.0,
            margins: MarginConfig::default(),
            element_styles,
            continuation_style: ContinuationStyle::default(),
            orphan_control: OrphanControlConfig::default(),
            scene_numbering: SceneNumberingConfig::default(),
            dual_dialogue_column_width: None, // Uses default (17 chars)
            locked_pages: LockedPageConfig::default(),
        }
    }

    /// Get the style for an element type
    pub fn style_for(&self, element_type: ElementType) -> &ElementStyle {
        self.element_styles
            .get(&element_type)
            .unwrap_or_else(|| {
                // Return a static default for missing types
                static DEFAULT: ElementStyle = ElementStyle {
                    margin_left: 0.0,
                    margin_right: 0.0,
                    max_chars_per_line: 60,
                    space_before: 1,
                    space_after: 0,
                    line_spacing: 1.0,
                    can_split: true,
                    min_lines_before_split: 2,
                    min_lines_after_split: 2,
                    keep_with_next: false,
                    keep_with_next_lines: 0,
                    force_uppercase: false,
                };
                &DEFAULT
            })
    }

    /// Calculate printable width in points
    pub fn printable_width_pt(&self) -> f64 {
        self.paper_size.width_pt() - self.margins.left_pt() - self.margins.right_pt()
    }

    /// Calculate printable height in points
    pub fn printable_height_pt(&self) -> f64 {
        self.paper_size.height_pt() - self.margins.top_pt() - self.margins.bottom_pt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feature_film_config() {
        let config = PageConfig::feature_film();
        assert_eq!(config.lines_per_page, 55);  // Final Draft standard
        assert_eq!(config.paper_size, PaperSize::UsLetter);
        assert!(config.element_styles.contains_key(&ElementType::SceneHeading));
    }

    #[test]
    fn test_us_letter_dimensions() {
        let paper = PaperSize::UsLetter;
        assert_eq!(paper.width_pt(), 612.0);
        assert_eq!(paper.height_pt(), 792.0);
    }

    #[test]
    fn test_printable_area() {
        let config = PageConfig::feature_film();
        // 8.5" - 1.5" - 1" = 6" = 432pt
        assert!((config.printable_width_pt() - 432.0).abs() < 0.01);
    }

    #[test]
    fn test_tv_one_hour_config() {
        let config = PageConfig::tv_one_hour();
        assert_eq!(config.lines_per_page, 53);  // TV standard
        assert_eq!(config.paper_size, PaperSize::UsLetter);
        assert!(config.element_styles.contains_key(&ElementType::SceneHeading));

        // Dialogue should be single-spaced for one-hour
        let dialogue_style = config.style_for(ElementType::Dialogue);
        assert_eq!(dialogue_style.line_spacing, 1.0);
    }

    #[test]
    fn test_tv_half_hour_config() {
        let config = PageConfig::tv_half_hour();
        assert_eq!(config.lines_per_page, 53);  // Same as one-hour
        assert_eq!(config.paper_size, PaperSize::UsLetter);

        // Half-hour is identical to one-hour format
        let dialogue_style = config.style_for(ElementType::Dialogue);
        assert_eq!(dialogue_style.line_spacing, 1.0);
    }

    #[test]
    fn test_tv_multi_cam_config() {
        let config = PageConfig::tv_multi_cam();
        assert_eq!(config.lines_per_page, 53);  // TV standard
        assert_eq!(config.paper_size, PaperSize::UsLetter);

        // KEY DIFFERENCE: Dialogue should be double-spaced for multi-cam
        let dialogue_style = config.style_for(ElementType::Dialogue);
        assert_eq!(dialogue_style.line_spacing, 2.0);

        // Parentheticals also double-spaced
        let paren_style = config.style_for(ElementType::Parenthetical);
        assert_eq!(paren_style.line_spacing, 2.0);

        // But action remains single-spaced
        let action_style = config.style_for(ElementType::Action);
        assert_eq!(action_style.line_spacing, 1.0);
    }

    #[test]
    fn test_all_formats_have_required_elements() {
        let formats = vec![
            PageConfig::feature_film(),
            PageConfig::tv_one_hour(),
            PageConfig::tv_half_hour(),
            PageConfig::tv_multi_cam(),
        ];

        for config in formats {
            // All formats must have these element types
            assert!(config.element_styles.contains_key(&ElementType::SceneHeading));
            assert!(config.element_styles.contains_key(&ElementType::Action));
            assert!(config.element_styles.contains_key(&ElementType::Character));
            assert!(config.element_styles.contains_key(&ElementType::Dialogue));
            assert!(config.element_styles.contains_key(&ElementType::Parenthetical));
        }
    }
}
