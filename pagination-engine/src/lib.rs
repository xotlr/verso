//! Verso Pagination Engine
//!
//! A deterministic screenplay pagination engine compiled to WebAssembly.
//! This engine calculates page breaks mathematically using the fixed properties
//! of screenplay format (Courier 12pt monospace), achieving sub-50ms pagination
//! for feature-length scripts.
//!
//! # Key Features
//!
//! - **Pure and deterministic**: Same input always produces same output
//! - **Configuration-driven**: All format variations expressed through PageConfig
//! - **No DOM measurement**: Math-based calculation only
//! - **Fast**: Designed for <50ms pagination of 120+ page scripts
//!
//! # Example
//!
//! ```ignore
//! use verso_pagination_engine::{paginate, Element, ElementType, PageConfig};
//!
//! let elements = vec![
//!     Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY"),
//!     Element::new("2", ElementType::Action, "A busy office."),
//! ];
//!
//! let config = PageConfig::feature_film();
//! let result = paginate(&elements, &config);
//!
//! println!("Total pages: {}", result.stats.page_count);
//! ```

use wasm_bindgen::prelude::*;

pub mod layout;
pub mod types;
pub mod utils;

pub use layout::paginate;
pub use types::*;

/// Initialize panic hook for better error messages in WASM
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Main entry point for pagination from JavaScript
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array
/// * `config_json` - JSON string of PageConfig
///
/// # Returns
///
/// JSON string of PaginationResult
#[wasm_bindgen]
pub fn paginate_document(elements_json: &str, config_json: &str) -> Result<String, JsError> {
    // Deserialize inputs
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    // Run pagination
    let result = paginate(&elements, &config);

    // Serialize output
    serde_json::to_string(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Get the default Feature Film configuration as JSON
#[wasm_bindgen]
pub fn get_feature_film_config() -> Result<String, JsError> {
    let config = PageConfig::feature_film();
    serde_json::to_string(&config)
        .map_err(|e| JsError::new(&format!("Failed to serialize config: {}", e)))
}

/// Calculate lines for a single element (useful for preview)
#[wasm_bindgen]
pub fn calculate_element_lines(element_json: &str, config_json: &str) -> Result<u32, JsError> {
    let element: Element = serde_json::from_str(element_json)
        .map_err(|e| JsError::new(&format!("Failed to parse element: {}", e)))?;

    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    let calculator = layout::LineCalculator::new(&config);
    let lines = calculator.calculate(&element);

    Ok(lines.total_lines)
}

/// Version of the pagination engine
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_paginate_document() {
        let elements_json = r#"[
            {"id": "1", "element_type": "scene_heading", "content": "INT. OFFICE - DAY"},
            {"id": "2", "element_type": "action", "content": "A busy office."}
        ]"#;

        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let result = paginate_document(elements_json, &config_json).unwrap();
        let parsed: PaginationResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.stats.page_count, 1);
        assert_eq!(parsed.stats.element_count, 2);
    }

    #[test]
    fn test_get_feature_film_config() {
        let config_json = get_feature_film_config().unwrap();
        let config: PageConfig = serde_json::from_str(&config_json).unwrap();

        assert_eq!(config.lines_per_page, 55);
    }

    #[test]
    fn test_calculate_element_lines() {
        let element_json = r#"{"id": "1", "element_type": "action", "content": "A short action."}"#;
        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let lines = calculate_element_lines(element_json, &config_json).unwrap();
        assert_eq!(lines, 1);
    }
}
