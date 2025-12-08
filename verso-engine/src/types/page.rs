use serde::{Deserialize, Serialize};
use super::ElementId;

/// Page identifier supporting A-pages for production scripts
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum PageIdentifier {
    /// Normal sequential page (1, 2, 3...)
    Sequential(u32),

    /// Inserted page after locking (47A, 47B...)
    Inserted { base: u32, suffix: char },

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

    /// For sorting: returns (base_number, suffix_ordinal)
    pub fn sort_key(&self) -> (u32, u8) {
        match self {
            PageIdentifier::Sequential(n) => (*n, 0),
            PageIdentifier::Inserted { base, suffix } => (*base, (*suffix as u8) - b'A' + 1),
            PageIdentifier::Omitted(n) => (*n, 0),
        }
    }

    /// Get the next sequential page
    pub fn next(&self) -> PageIdentifier {
        match self {
            PageIdentifier::Sequential(n) => PageIdentifier::Sequential(n + 1),
            PageIdentifier::Inserted { base, suffix } => {
                if *suffix == 'Z' {
                    // Wrap to next number (rare edge case)
                    PageIdentifier::Sequential(base + 1)
                } else {
                    PageIdentifier::Inserted {
                        base: *base,
                        suffix: ((*suffix as u8) + 1) as char,
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
}

impl Page {
    pub fn new(identifier: PageIdentifier) -> Self {
        Self {
            identifier,
            elements: Vec::new(),
            bottom_continuation: None,
            lines_used: 0,
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
        assert_eq!(
            PageIdentifier::Inserted { base: 47, suffix: 'A' }.display(),
            "47A"
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
            PageIdentifier::Inserted { base: 47, suffix: 'A' }.next(),
            PageIdentifier::Inserted { base: 47, suffix: 'B' }
        );
    }

    #[test]
    fn test_page_identifier_sort_key() {
        let p1 = PageIdentifier::Sequential(47);
        let p2 = PageIdentifier::Inserted { base: 47, suffix: 'A' };
        let p3 = PageIdentifier::Inserted { base: 47, suffix: 'B' };
        let p4 = PageIdentifier::Sequential(48);

        assert!(p1.sort_key() < p2.sort_key());
        assert!(p2.sort_key() < p3.sort_key());
        assert!(p3.sort_key() < p4.sort_key());
    }
}
