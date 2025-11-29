use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{ElementId, Page, PageIdentifier};

/// Position of an element in the paginated document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementPosition {
    /// Page(s) this element appears on
    pub pages: Vec<PageIdentifier>,

    /// Starting line on first page (1-indexed)
    pub start_line: u8,

    /// Ending line on last page (1-indexed)
    pub end_line: u8,

    /// Whether element was split across pages
    pub is_split: bool,
}

/// Warning generated during pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationWarning {
    pub element_id: Option<ElementId>,
    pub warning_type: WarningType,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WarningType {
    /// Element is longer than a full page
    ElementExceedsPage,

    /// Orphan could not be prevented
    UnpreventableOrphan,

    /// Unusual element configuration
    ConfigurationWarning,

    /// Dual dialogue layout issue
    DualDialogueOverflow,
}

/// Statistics about the pagination run
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationStats {
    /// Total page count
    pub page_count: u32,

    /// Total elements processed
    pub element_count: usize,

    /// Number of page breaks
    pub break_count: usize,

    /// Number of dialogue continuations (MORE/CONT'D)
    pub continuation_count: usize,

    /// Pagination timing in microseconds
    pub timing_us: u64,
}

/// Complete result of pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationResult {
    /// All pages in order
    pub pages: Vec<Page>,

    /// Quick lookup: element ID -> position
    pub element_positions: HashMap<String, ElementPosition>,

    /// Any warnings generated
    pub warnings: Vec<PaginationWarning>,

    /// Statistics
    pub stats: PaginationStats,
}

impl PaginationResult {
    pub fn new() -> Self {
        Self {
            pages: Vec::new(),
            element_positions: HashMap::new(),
            warnings: Vec::new(),
            stats: PaginationStats {
                page_count: 0,
                element_count: 0,
                break_count: 0,
                continuation_count: 0,
                timing_us: 0,
            },
        }
    }

    /// Get the page for a given element ID
    pub fn get_page_for_element(&self, element_id: &str) -> Option<&PageIdentifier> {
        self.element_positions
            .get(element_id)
            .and_then(|pos| pos.pages.first())
    }

    /// Get page count
    pub fn page_count(&self) -> u32 {
        self.stats.page_count
    }
}

impl Default for PaginationResult {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_result_new() {
        let result = PaginationResult::new();
        assert_eq!(result.pages.len(), 0);
        assert_eq!(result.stats.page_count, 0);
    }
}
