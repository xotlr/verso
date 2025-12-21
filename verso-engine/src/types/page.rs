use serde::{Deserialize, Serialize};
use super::ElementId;

/// Page identifier supporting A-pages for production scripts
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum PageIdentifier {
    /// Normal sequential page (1, 2, 3...)
    Sequential(u32),

    /// Inserted page after locking (47A, 47B... 47Z, 47AA, 47AB...)
    /// Suffix supports single letters (A-Z) and double letters (AA-ZZ) for overflow
    Inserted { base: u32, suffix: String },

    /// Omitted page marker (page was removed but number preserved)
    Omitted(u32),
}

impl PageIdentifier {
    pub fn display(&self) -> String {
        match self {
            PageIdentifier::Sequential(n) => format!("{}", n),
            PageIdentifier::Inserted { base, suffix } => format!("{}{}", base, suffix),
            PageIdentifier::Omitted(n) => format!("{} OMITTED", n),
        }
    }

    /// Create a new inserted page with a single-letter suffix
    pub fn inserted(base: u32, suffix: char) -> Self {
        PageIdentifier::Inserted {
            base,
            suffix: suffix.to_string(),
        }
    }

    /// For sorting: returns (base_number, suffix_ordinal)
    /// Single letters A-Z = 1-26, double letters AA-ZZ = 27-702
    pub fn sort_key(&self) -> (u32, u16) {
        match self {
            PageIdentifier::Sequential(n) => (*n, 0),
            PageIdentifier::Inserted { base, suffix } => {
                let ordinal = Self::suffix_to_ordinal(suffix);
                (*base, ordinal)
            }
            PageIdentifier::Omitted(n) => (*n, 0),
        }
    }

    /// Convert suffix to ordinal (A=1, B=2, ... Z=26, AA=27, AB=28, ... ZZ=702)
    fn suffix_to_ordinal(suffix: &str) -> u16 {
        let chars: Vec<char> = suffix.chars().collect();
        match chars.len() {
            1 => (chars[0] as u16) - ('A' as u16) + 1,
            2 => {
                let first = (chars[0] as u16) - ('A' as u16);
                let second = (chars[1] as u16) - ('A' as u16) + 1;
                26 + first * 26 + second
            }
            _ => 0, // Invalid suffix
        }
    }

    /// Get the next suffix in sequence (A->B, Z->AA, AZ->BA, ZZ wraps to next page)
    fn next_suffix(suffix: &str) -> Option<String> {
        let chars: Vec<char> = suffix.chars().collect();
        match chars.len() {
            1 => {
                if chars[0] == 'Z' {
                    // Single letter overflow: Z -> AA
                    Some("AA".to_string())
                } else {
                    Some(((chars[0] as u8) + 1) as char).map(|c| c.to_string())
                }
            }
            2 => {
                let first = chars[0];
                let second = chars[1];
                if second == 'Z' {
                    if first == 'Z' {
                        // ZZ -> None (wrap to next base page)
                        None
                    } else {
                        // AZ -> BA, BZ -> CA, etc.
                        Some(format!("{}A", ((first as u8) + 1) as char))
                    }
                } else {
                    // AA -> AB, AB -> AC, etc.
                    Some(format!("{}{}", first, ((second as u8) + 1) as char))
                }
            }
            _ => None,
        }
    }

    /// Get the next sequential page
    pub fn next(&self) -> PageIdentifier {
        match self {
            PageIdentifier::Sequential(n) => PageIdentifier::Sequential(n + 1),
            PageIdentifier::Inserted { base, suffix } => {
                match Self::next_suffix(suffix) {
                    Some(next_suffix) => PageIdentifier::Inserted {
                        base: *base,
                        suffix: next_suffix,
                    },
                    None => {
                        // Extremely rare: exceeded ZZ (702 A-pages on one base page)
                        // Fall back to next sequential page
                        PageIdentifier::Sequential(base + 1)
                    }
                }
            }
            PageIdentifier::Omitted(n) => PageIdentifier::Sequential(n + 1),
        }
    }
}

impl Default for PageIdentifier {
    fn default() -> Self {
        Self::Sequential(1)
    }
}

/// Reason for a page break
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PageBreakReason {
    /// Page filled naturally
    PageFull,

    /// Forced by explicit page break element
    Forced,

    /// Act break (TV scripts)
    ActBreak,

    /// Moved to prevent orphan
    OrphanPrevention,

    /// Dialogue split with continuation
    DialogueContinuation,
}

/// A page break point in the document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageBreak {
    /// Element ID after which this break occurs
    pub after_element: ElementId,

    /// If element was split, line number within element (0-indexed)
    pub split_at_line: Option<u32>,

    /// Reason for the break
    pub reason: PageBreakReason,
}

/// Range of lines within a split element
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineRange {
    /// Starting line within the element (0-indexed)
    pub start: u32,
    /// Ending line within the element (exclusive)
    pub end: u32,
}

/// An element's placement on a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageElement {
    pub element_id: ElementId,

    /// Starting line on this page (1-indexed)
    pub start_line: u8,

    /// Number of lines this element occupies on this page
    pub line_count: u8,

    /// If this is a continued element (from previous page)
    pub is_continuation: bool,

    /// If this is a partial element (split), which lines from the original
    pub line_range: Option<LineRange>,

    /// Continuation prefix for character (e.g., "JOHN (CONT'D)")
    pub continuation_prefix: Option<String>,
}

/// A single page in the paginated output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page {
    pub identifier: PageIdentifier,

    /// Element placements on this page
    pub elements: Vec<PageElement>,

    /// Continuation marker at bottom (e.g., "(MORE)")
    pub bottom_continuation: Option<String>,

    /// Lines used on this page
    pub lines_used: u8,

    /// Pixel offset from document start (at 96 DPI)
    /// This is the exact Y position where this page starts in the rendered view
    #[serde(default)]
    pub pixel_y: f32,

    /// Bottom padding in pixels - height of pm-page-bottom decoration
    /// Calculated as: (lines_per_page - lines_used) * line_height_px + bottom_margin_px
    /// WASM is single source of truth for this value - TypeScript uses it directly
    #[serde(default)]
    pub bottom_padding_px: f32,

    // --- Scene-level continuation markers (shooting script feature) ---

    /// Scene continuation marker at bottom of page (e.g., "(CONTINUED)")
    /// Set when page breaks mid-scene and scene_continued_enabled is true
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scene_continued_bottom: Option<String>,

    /// Scene continuation marker at top of page (e.g., "CONTINUED:")
    /// Set when this page continues a scene from the previous page
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scene_continued_top: Option<String>,

    /// The scene number being continued (for markers like "CONTINUED: (42)")
    /// Only set when scene_continued_with_number is true
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub continued_scene_number: Option<u32>,
}

impl Page {
    pub fn new(identifier: PageIdentifier) -> Self {
        Self {
            identifier,
            elements: Vec::new(),
            bottom_continuation: None,
            lines_used: 0,
            pixel_y: 0.0,
            bottom_padding_px: 0.0,
            scene_continued_bottom: None,
            scene_continued_top: None,
            continued_scene_number: None,
        }
    }

    pub fn new_at_offset(identifier: PageIdentifier, pixel_y: f32) -> Self {
        Self {
            identifier,
            elements: Vec::new(),
            bottom_continuation: None,
            lines_used: 0,
            pixel_y,
            bottom_padding_px: 0.0,
            scene_continued_bottom: None,
            scene_continued_top: None,
            continued_scene_number: None,
        }
    }

    pub fn lines_remaining(&self, lines_per_page: u8) -> u8 {
        lines_per_page.saturating_sub(self.lines_used)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_page_identifier_display() {
        assert_eq!(PageIdentifier::Sequential(42).display(), "42");
        assert_eq!(PageIdentifier::inserted(47, 'A').display(), "47A");
        assert_eq!(
            PageIdentifier::Inserted { base: 47, suffix: "AA".to_string() }.display(),
            "47AA"
        );
        assert_eq!(PageIdentifier::Omitted(10).display(), "10 OMITTED");
    }

    #[test]
    fn test_page_identifier_next() {
        assert_eq!(
            PageIdentifier::Sequential(1).next(),
            PageIdentifier::Sequential(2)
        );
        assert_eq!(
            PageIdentifier::inserted(47, 'A').next(),
            PageIdentifier::Inserted { base: 47, suffix: "B".to_string() }
        );
    }

    #[test]
    fn test_page_identifier_sort_key() {
        let p1 = PageIdentifier::Sequential(47);
        let p2 = PageIdentifier::inserted(47, 'A');
        let p3 = PageIdentifier::inserted(47, 'B');
        let p4 = PageIdentifier::Sequential(48);

        assert!(p1.sort_key() < p2.sort_key());
        assert!(p2.sort_key() < p3.sort_key());
        assert!(p3.sort_key() < p4.sort_key());
    }

    #[test]
    fn test_suffix_overflow() {
        // Single letter to next single letter
        assert_eq!(
            PageIdentifier::inserted(47, 'A').next(),
            PageIdentifier::Inserted { base: 47, suffix: "B".to_string() }
        );

        // Z overflows to AA (double letters)
        assert_eq!(
            PageIdentifier::inserted(47, 'Z').next(),
            PageIdentifier::Inserted { base: 47, suffix: "AA".to_string() }
        );

        // AA -> AB
        assert_eq!(
            PageIdentifier::Inserted { base: 47, suffix: "AA".to_string() }.next(),
            PageIdentifier::Inserted { base: 47, suffix: "AB".to_string() }
        );

        // AZ -> BA
        assert_eq!(
            PageIdentifier::Inserted { base: 47, suffix: "AZ".to_string() }.next(),
            PageIdentifier::Inserted { base: 47, suffix: "BA".to_string() }
        );

        // ZZ overflows to next sequential page
        assert_eq!(
            PageIdentifier::Inserted { base: 47, suffix: "ZZ".to_string() }.next(),
            PageIdentifier::Sequential(48)
        );
    }

    #[test]
    fn test_suffix_ordinal() {
        // Single letters: A=1, B=2, ... Z=26
        assert_eq!(PageIdentifier::inserted(1, 'A').sort_key(), (1, 1));
        assert_eq!(PageIdentifier::inserted(1, 'Z').sort_key(), (1, 26));

        // Double letters: AA=27, AB=28, ... AZ=52, BA=53, ... ZZ=702
        assert_eq!(
            PageIdentifier::Inserted { base: 1, suffix: "AA".to_string() }.sort_key(),
            (1, 27)
        );
        assert_eq!(
            PageIdentifier::Inserted { base: 1, suffix: "AZ".to_string() }.sort_key(),
            (1, 52)
        );
        assert_eq!(
            PageIdentifier::Inserted { base: 1, suffix: "BA".to_string() }.sort_key(),
            (1, 53)
        );
        assert_eq!(
            PageIdentifier::Inserted { base: 1, suffix: "ZZ".to_string() }.sort_key(),
            (1, 702)
        );
    }
}
