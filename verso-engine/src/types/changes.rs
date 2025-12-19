//! Document change tracking for incremental pagination.
//!
//! This module defines types for tracking changes to a screenplay document,
//! enabling incremental pagination that only recalculates affected pages.

use serde::{Deserialize, Serialize};

/// Represents a change to the document that may affect pagination.
///
/// Changes are specified as a range of element indices that were modified.
/// The pagination engine uses this information to determine which pages
/// need to be recalculated.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChange {
    /// Index of first element that changed (inclusive).
    /// This is a 0-based index into the elements array.
    pub start_index: usize,

    /// Index after last element that changed (exclusive).
    /// Use `start_index + 1` for a single element change.
    pub end_index: usize,

    /// Type of change that occurred.
    pub change_type: ChangeType,
}

impl DocumentChange {
    /// Create a new document change.
    pub fn new(start_index: usize, end_index: usize, change_type: ChangeType) -> Self {
        Self {
            start_index,
            end_index,
            change_type,
        }
    }

    /// Create a change for a single element modification.
    pub fn modify_single(index: usize) -> Self {
        Self {
            start_index: index,
            end_index: index + 1,
            change_type: ChangeType::Modify,
        }
    }

    /// Create a change for inserting elements.
    pub fn insert(start_index: usize, count: usize) -> Self {
        Self {
            start_index,
            end_index: start_index + count,
            change_type: ChangeType::Insert,
        }
    }

    /// Create a change for deleting elements.
    /// Note: `end_index` refers to the original indices before deletion.
    pub fn delete(start_index: usize, count: usize) -> Self {
        Self {
            start_index,
            end_index: start_index + count,
            change_type: ChangeType::Delete,
        }
    }

    /// Returns the number of elements affected by this change.
    pub fn affected_count(&self) -> usize {
        self.end_index.saturating_sub(self.start_index)
    }
}

/// Type of document change.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    /// New elements were inserted into the document.
    Insert,

    /// Elements were deleted from the document.
    Delete,

    /// Existing elements were modified (content or type changed).
    Modify,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_change_new() {
        let change = DocumentChange::new(5, 10, ChangeType::Modify);
        assert_eq!(change.start_index, 5);
        assert_eq!(change.end_index, 10);
        assert_eq!(change.change_type, ChangeType::Modify);
        assert_eq!(change.affected_count(), 5);
    }

    #[test]
    fn test_modify_single() {
        let change = DocumentChange::modify_single(3);
        assert_eq!(change.start_index, 3);
        assert_eq!(change.end_index, 4);
        assert_eq!(change.change_type, ChangeType::Modify);
        assert_eq!(change.affected_count(), 1);
    }

    #[test]
    fn test_insert() {
        let change = DocumentChange::insert(10, 5);
        assert_eq!(change.start_index, 10);
        assert_eq!(change.end_index, 15);
        assert_eq!(change.change_type, ChangeType::Insert);
        assert_eq!(change.affected_count(), 5);
    }

    #[test]
    fn test_delete() {
        let change = DocumentChange::delete(7, 3);
        assert_eq!(change.start_index, 7);
        assert_eq!(change.end_index, 10);
        assert_eq!(change.change_type, ChangeType::Delete);
        assert_eq!(change.affected_count(), 3);
    }

    #[test]
    fn test_serialization() {
        let change = DocumentChange::new(0, 5, ChangeType::Insert);
        let json = serde_json::to_string(&change).unwrap();
        let deserialized: DocumentChange = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.start_index, 0);
        assert_eq!(deserialized.end_index, 5);
        assert_eq!(deserialized.change_type, ChangeType::Insert);
    }
}
