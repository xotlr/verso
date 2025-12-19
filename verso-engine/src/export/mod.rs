//! Export module for converting screenplay elements to various formats.
//!
//! This module provides exporters for converting Verso's internal screenplay
//! representation to standard screenplay file formats.
//!
//! # Supported Formats
//!
//! - **Fountain** (.fountain): Plain-text screenplay format
//!   - Widely supported by screenplay editors
//!   - Human-readable and diff-friendly
//!   - See: https://fountain.io/syntax
//!
//! - **FDX** (.fdx): Final Draft XML format
//!   - Industry standard for professional screenwriting
//!   - Compatible with Final Draft and other professional software
//!   - Full screenplay formatting preserved
//!
//! # Example
//!
//! ```ignore
//! use verso_pagination_engine::export::{export_to_fountain, export_to_fdx};
//! use verso_pagination_engine::{Element, ElementType, DocumentMetadata};
//!
//! let elements = vec![
//!     Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
//!     Element::new("2", ElementType::Action, "A busy office."),
//! ];
//!
//! let metadata = DocumentMetadata::new()
//!     .title("My Screenplay")
//!     .author("John Smith");
//!
//! // Export to Fountain (plain text)
//! let fountain = export_to_fountain(&elements, Some(&metadata));
//! println!("{}", fountain);
//!
//! // Export to FDX (Final Draft XML)
//! let fdx = export_to_fdx(&elements, Some(&metadata));
//! println!("{}", fdx);
//! ```

mod fdx;
mod fountain;
mod render;

pub use fdx::*;
pub use fountain::*;
pub use render::*;
