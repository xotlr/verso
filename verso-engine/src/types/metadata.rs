//! Document metadata types for title page rendering and export headers.
//!
//! This module provides types for storing screenplay metadata such as title,
//! author, draft information, and revision tracking. This metadata is passed
//! through the pagination engine for frontend rendering.

use serde::{Deserialize, Serialize};

/// Document metadata for title page rendering and export headers.
///
/// This structure stores information typically displayed on a screenplay's
/// title page and used in export headers. All fields are optional to support
/// partial metadata.
///
/// # Example
///
/// ```
/// use verso_pagination_engine::DocumentMetadata;
///
/// let metadata = DocumentMetadata {
///     title: Some("My Screenplay".to_string()),
///     author: Some("Jane Writer".to_string()),
///     draft: Some("First Draft".to_string()),
///     date: Some("December 2025".to_string()),
///     ..Default::default()
/// };
/// ```
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct DocumentMetadata {
    /// Script title
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// Author/Writer credit
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,

    /// Contact information (address, phone, email, agent)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contact: Option<String>,

    /// Draft information (e.g., "First Draft", "Final Draft", "Shooting Script")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft: Option<String>,

    /// Draft date (e.g., "December 18, 2025")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,

    /// Copyright notice (e.g., "Copyright 2025 Jane Writer")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub copyright: Option<String>,

    /// Additional notes (e.g., "Based on the novel by...")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    /// Revision color for colored revision pages (production scripts)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub revision_color: Option<RevisionColor>,
}

impl DocumentMetadata {
    /// Create a new empty DocumentMetadata
    pub fn new() -> Self {
        Self::default()
    }

    /// Create DocumentMetadata with title and author
    pub fn with_title_author(title: impl Into<String>, author: impl Into<String>) -> Self {
        Self {
            title: Some(title.into()),
            author: Some(author.into()),
            ..Default::default()
        }
    }

    /// Builder pattern: set the title
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// Builder pattern: set the author
    pub fn author(mut self, author: impl Into<String>) -> Self {
        self.author = Some(author.into());
        self
    }

    /// Builder pattern: set the draft info
    pub fn draft(mut self, draft: impl Into<String>) -> Self {
        self.draft = Some(draft.into());
        self
    }

    /// Builder pattern: set the date
    pub fn date(mut self, date: impl Into<String>) -> Self {
        self.date = Some(date.into());
        self
    }

    /// Builder pattern: set the contact info
    pub fn contact(mut self, contact: impl Into<String>) -> Self {
        self.contact = Some(contact.into());
        self
    }

    /// Builder pattern: set the copyright
    pub fn copyright(mut self, copyright: impl Into<String>) -> Self {
        self.copyright = Some(copyright.into());
        self
    }

    /// Builder pattern: set additional notes
    pub fn notes(mut self, notes: impl Into<String>) -> Self {
        self.notes = Some(notes.into());
        self
    }

    /// Builder pattern: set the revision color
    pub fn revision_color(mut self, color: RevisionColor) -> Self {
        self.revision_color = Some(color);
        self
    }

    /// Check if metadata has any content set
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.author.is_none()
            && self.contact.is_none()
            && self.draft.is_none()
            && self.date.is_none()
            && self.copyright.is_none()
            && self.notes.is_none()
            && self.revision_color.is_none()
    }
}

/// Revision color for production script revision tracking.
///
/// In professional film/TV production, script revisions are tracked using
/// colored pages. Each revision gets a new color, allowing crew members
/// to easily identify which version of a page they have.
///
/// The standard industry color order is:
/// 1. White (original)
/// 2. Blue (1st revision)
/// 3. Pink (2nd revision)
/// 4. Yellow (3rd revision)
/// 5. Green (4th revision)
/// 6. Goldenrod (5th revision)
/// 7. Buff (6th revision)
/// 8. Salmon (7th revision)
/// 9. Cherry (8th revision)
///
/// After Cherry, the cycle typically repeats with "2nd White", "2nd Blue", etc.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RevisionColor {
    /// Original script (white pages)
    White,
    /// 1st revision (blue pages)
    Blue,
    /// 2nd revision (pink pages)
    Pink,
    /// 3rd revision (yellow pages)
    Yellow,
    /// 4th revision (green pages)
    Green,
    /// 5th revision (goldenrod pages)
    Goldenrod,
    /// 6th revision (buff pages)
    Buff,
    /// 7th revision (salmon pages)
    Salmon,
    /// 8th revision (cherry pages)
    Cherry,
}

impl RevisionColor {
    /// Get the display name for this revision color
    pub fn display_name(&self) -> &'static str {
        match self {
            RevisionColor::White => "White",
            RevisionColor::Blue => "Blue",
            RevisionColor::Pink => "Pink",
            RevisionColor::Yellow => "Yellow",
            RevisionColor::Green => "Green",
            RevisionColor::Goldenrod => "Goldenrod",
            RevisionColor::Buff => "Buff",
            RevisionColor::Salmon => "Salmon",
            RevisionColor::Cherry => "Cherry",
        }
    }

    /// Get the revision number (1-based, where White = 1)
    pub fn revision_number(&self) -> u8 {
        match self {
            RevisionColor::White => 1,
            RevisionColor::Blue => 2,
            RevisionColor::Pink => 3,
            RevisionColor::Yellow => 4,
            RevisionColor::Green => 5,
            RevisionColor::Goldenrod => 6,
            RevisionColor::Buff => 7,
            RevisionColor::Salmon => 8,
            RevisionColor::Cherry => 9,
        }
    }

    /// Get the color from a revision number (1-based)
    /// Returns None if the number is out of range (> 9)
    pub fn from_revision_number(num: u8) -> Option<Self> {
        match num {
            1 => Some(RevisionColor::White),
            2 => Some(RevisionColor::Blue),
            3 => Some(RevisionColor::Pink),
            4 => Some(RevisionColor::Yellow),
            5 => Some(RevisionColor::Green),
            6 => Some(RevisionColor::Goldenrod),
            7 => Some(RevisionColor::Buff),
            8 => Some(RevisionColor::Salmon),
            9 => Some(RevisionColor::Cherry),
            _ => None,
        }
    }

    /// Get all revision colors in order
    pub fn all() -> &'static [RevisionColor] {
        &[
            RevisionColor::White,
            RevisionColor::Blue,
            RevisionColor::Pink,
            RevisionColor::Yellow,
            RevisionColor::Green,
            RevisionColor::Goldenrod,
            RevisionColor::Buff,
            RevisionColor::Salmon,
            RevisionColor::Cherry,
        ]
    }
}

impl Default for RevisionColor {
    fn default() -> Self {
        RevisionColor::White
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_metadata_default() {
        let metadata = DocumentMetadata::default();
        assert!(metadata.is_empty());
        assert!(metadata.title.is_none());
        assert!(metadata.author.is_none());
    }

    #[test]
    fn test_document_metadata_builder() {
        let metadata = DocumentMetadata::new()
            .title("Test Script")
            .author("John Doe")
            .draft("First Draft")
            .date("December 2025");

        assert_eq!(metadata.title, Some("Test Script".to_string()));
        assert_eq!(metadata.author, Some("John Doe".to_string()));
        assert_eq!(metadata.draft, Some("First Draft".to_string()));
        assert_eq!(metadata.date, Some("December 2025".to_string()));
        assert!(!metadata.is_empty());
    }

    #[test]
    fn test_document_metadata_with_title_author() {
        let metadata = DocumentMetadata::with_title_author("My Movie", "Jane Writer");
        assert_eq!(metadata.title, Some("My Movie".to_string()));
        assert_eq!(metadata.author, Some("Jane Writer".to_string()));
    }

    #[test]
    fn test_document_metadata_serialization() {
        let metadata = DocumentMetadata::new()
            .title("Test")
            .revision_color(RevisionColor::Blue);

        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("\"title\":\"Test\""));
        assert!(json.contains("\"revision_color\":\"blue\""));

        let parsed: DocumentMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.title, Some("Test".to_string()));
        assert_eq!(parsed.revision_color, Some(RevisionColor::Blue));
    }

    #[test]
    fn test_document_metadata_empty_serialization() {
        let metadata = DocumentMetadata::default();
        let json = serde_json::to_string(&metadata).unwrap();
        // Empty optional fields should be skipped
        assert_eq!(json, "{}");
    }

    #[test]
    fn test_revision_color_display_name() {
        assert_eq!(RevisionColor::White.display_name(), "White");
        assert_eq!(RevisionColor::Blue.display_name(), "Blue");
        assert_eq!(RevisionColor::Cherry.display_name(), "Cherry");
    }

    #[test]
    fn test_revision_color_revision_number() {
        assert_eq!(RevisionColor::White.revision_number(), 1);
        assert_eq!(RevisionColor::Blue.revision_number(), 2);
        assert_eq!(RevisionColor::Cherry.revision_number(), 9);
    }

    #[test]
    fn test_revision_color_from_number() {
        assert_eq!(RevisionColor::from_revision_number(1), Some(RevisionColor::White));
        assert_eq!(RevisionColor::from_revision_number(9), Some(RevisionColor::Cherry));
        assert_eq!(RevisionColor::from_revision_number(0), None);
        assert_eq!(RevisionColor::from_revision_number(10), None);
    }

    #[test]
    fn test_revision_color_all() {
        let all = RevisionColor::all();
        assert_eq!(all.len(), 9);
        assert_eq!(all[0], RevisionColor::White);
        assert_eq!(all[8], RevisionColor::Cherry);
    }

    #[test]
    fn test_revision_color_serialization() {
        // Test snake_case serialization
        let json = serde_json::to_string(&RevisionColor::Goldenrod).unwrap();
        assert_eq!(json, "\"goldenrod\"");

        let parsed: RevisionColor = serde_json::from_str("\"goldenrod\"").unwrap();
        assert_eq!(parsed, RevisionColor::Goldenrod);
    }
}
