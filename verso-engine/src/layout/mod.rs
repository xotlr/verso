//! Layout engine for screenplay pagination.
//!
//! This module provides the core pagination functionality for the Verso engine.
//! It calculates page breaks, handles dialogue continuations, and produces
//! deterministic output without any DOM measurement.
//!
//! # Module Structure
//!
//! The pagination logic is split into focused modules:
//!
//! - [`constants`]: DPI constants and pixel conversion utilities
//! - [`glue`]: Element pairing logic (CHARACTER + DIALOGUE must stay together)
//! - [`break_decision`]: Page break decision algorithms
//! - [`state`]: Internal pagination state management
//! - [`page_breaker`]: Main pagination entry points
//!
//! Supporting modules:
//!
//! - [`line_calculator`]: Line count calculations for elements
//! - [`continuation`]: MORE/CONT'D dialogue continuation handling
//! - [`character_contd`]: Auto-detection of character CONT'D
//! - [`scene_numbering`]: Scene number assignment
//! - [`dual_dialogue`]: Side-by-side dialogue handling
//! - [`stats`]: Document statistics calculation
//! - [`locked_pages`]: Production script A-page numbering
//! - [`incremental`]: Incremental pagination with caching

// Core pagination modules
mod constants;
mod glue;
mod break_decision;
mod state;
mod page_breaker;

// Supporting modules
mod line_calculator;
mod continuation;
mod character_contd;
mod scene_numbering;
mod dual_dialogue;
mod stats;
mod locked_pages;
mod incremental;

// Re-export constants
pub use constants::{DPI, PT_TO_PX, PAGE_GAP_PX, points_to_pixels};

// Re-export glue logic
pub use glue::{is_glue_pair, calculate_glue_group_cost};

// Re-export break decision
pub use break_decision::{BreakDecision, decide_break, estimate_following_lines};

// Re-export state
pub use state::PaginationState;

// Re-export main pagination functions
pub use page_breaker::{paginate, paginate_with_title_page, paginate_incremental};

// Re-export supporting modules
pub use line_calculator::*;
pub use continuation::*;
pub use character_contd::*;
pub use scene_numbering::*;
pub use dual_dialogue::*;
pub use stats::*;
pub use locked_pages::*;
pub use incremental::*;
