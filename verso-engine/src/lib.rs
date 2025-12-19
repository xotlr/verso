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

pub mod export;
pub mod layout;
pub mod types;
pub mod utils;

pub use export::*;
pub use layout::{paginate, paginate_with_title_page, paginate_incremental};
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

/// Pagination with title page awareness - RECOMMENDED ENTRY POINT
///
/// This function makes WASM the single source of truth for all positioning.
/// When `has_title_page` is true:
/// - Title page is inserted as page 1 with pixel_y: 0
/// - All content pages start from page 2
/// - All pixel_y values include the title page offset
///
/// JavaScript should use the pixel_y values directly without any offset calculations.
/// The result includes complete LayoutMetadata in stats.layout.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array (content elements, NOT including title page)
/// * `config_json` - JSON string of PageConfig
/// * `has_title_page` - Whether the document has a title page
///
/// # Returns
///
/// JSON string of PaginationResult with absolute pixel positions
#[wasm_bindgen]
pub fn paginate_document_v2(
    elements_json: &str,
    config_json: &str,
    has_title_page: bool,
) -> Result<String, JsError> {
    // Deserialize inputs
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    // Run pagination with title page awareness (no metadata)
    let result = paginate_with_title_page(&elements, &config, has_title_page, None);

    // Serialize output
    serde_json::to_string(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Pagination with title page awareness and document metadata - FULL FEATURED ENTRY POINT
///
/// This function extends paginate_document_v2 with document metadata support.
/// Metadata is passed through to the result for frontend rendering of title pages
/// and export headers.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array (content elements, NOT including title page)
/// * `config_json` - JSON string of PageConfig
/// * `has_title_page` - Whether the document has a title page
/// * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
///
/// # Returns
///
/// JSON string of PaginationResult with absolute pixel positions and metadata
#[wasm_bindgen]
pub fn paginate_document_v3(
    elements_json: &str,
    config_json: &str,
    has_title_page: bool,
    metadata_json: &str,
) -> Result<String, JsError> {
    // Deserialize inputs
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    // Parse optional metadata (empty string, "null", or "{}" all result in None)
    let metadata: Option<DocumentMetadata> = if metadata_json.is_empty()
        || metadata_json == "null"
        || metadata_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(metadata_json)
                .map_err(|e| JsError::new(&format!("Failed to parse metadata: {}", e)))?,
        )
    };

    // Run pagination with title page awareness and metadata
    let result = paginate_with_title_page(&elements, &config, has_title_page, metadata.as_ref());

    // Serialize output
    serde_json::to_string(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Incremental pagination with caching support - PERFORMANCE OPTIMIZED ENTRY POINT
///
/// This function extends paginate_document_v3 with incremental pagination support.
/// When a cache and changes are provided, it can skip recalculating pages that
/// haven't changed, significantly improving performance for large documents.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array (content elements)
/// * `config_json` - JSON string of PageConfig
/// * `has_title_page` - Whether the document has a title page
/// * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
/// * `changes_json` - Optional JSON string of DocumentChange array (pass empty string or "null" to skip)
/// * `cache_json` - Optional JSON string of PaginationCache from previous result (pass empty string or "null" for first call)
///
/// # Returns
///
/// JSON string of PaginationResult with `cache` field populated for subsequent incremental calls.
///
/// # Performance
///
/// - First call (no cache): Same as paginate_document_v3
/// - Subsequent calls with cache: Up to 5-10x faster for end-of-document edits
///
/// # Example
///
/// ```javascript
/// // First pagination - no cache
/// const result1 = paginate_document_incremental(elements, config, true, metadata, null, null);
/// const cache = result1.cache;
///
/// // User edits element at index 500
/// const changes = [{ start_index: 500, end_index: 501, change_type: "modify" }];
///
/// // Incremental pagination - reuses earlier pages
/// const result2 = paginate_document_incremental(elements, config, true, metadata, changes, cache);
/// ```
#[wasm_bindgen]
pub fn paginate_document_incremental(
    elements_json: &str,
    config_json: &str,
    has_title_page: bool,
    metadata_json: &str,
    changes_json: &str,
    cache_json: &str,
) -> Result<String, JsError> {
    // Deserialize elements
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    // Deserialize config
    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    // Parse optional metadata
    let metadata: Option<DocumentMetadata> = if metadata_json.is_empty()
        || metadata_json == "null"
        || metadata_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(metadata_json)
                .map_err(|e| JsError::new(&format!("Failed to parse metadata: {}", e)))?,
        )
    };

    // Parse optional changes
    let changes: Option<Vec<DocumentChange>> = if changes_json.is_empty()
        || changes_json == "null"
        || changes_json == "[]"
    {
        None
    } else {
        Some(
            serde_json::from_str(changes_json)
                .map_err(|e| JsError::new(&format!("Failed to parse changes: {}", e)))?,
        )
    };

    // Parse optional cache
    let cache: Option<PaginationCache> = if cache_json.is_empty()
        || cache_json == "null"
        || cache_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(cache_json)
                .map_err(|e| JsError::new(&format!("Failed to parse cache: {}", e)))?,
        )
    };

    // Run incremental pagination
    let result = paginate_incremental(
        &elements,
        &config,
        has_title_page,
        metadata.as_ref(),
        changes.as_deref(),
        cache.as_ref(),
    );

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

/// Get the TV One-Hour Drama configuration as JSON
#[wasm_bindgen]
pub fn get_tv_one_hour_config() -> Result<String, JsError> {
    let config = PageConfig::tv_one_hour();
    serde_json::to_string(&config)
        .map_err(|e| JsError::new(&format!("Failed to serialize config: {}", e)))
}

/// Get the TV Half-Hour Comedy configuration as JSON
#[wasm_bindgen]
pub fn get_tv_half_hour_config() -> Result<String, JsError> {
    let config = PageConfig::tv_half_hour();
    serde_json::to_string(&config)
        .map_err(|e| JsError::new(&format!("Failed to serialize config: {}", e)))
}

/// Get the TV Multi-Camera Sitcom configuration as JSON
#[wasm_bindgen]
pub fn get_tv_multi_cam_config() -> Result<String, JsError> {
    let config = PageConfig::tv_multi_cam();
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

// ============================================================================
// Export Functions
// ============================================================================

/// Export elements to Fountain format
///
/// Fountain is a plain-text screenplay format widely supported by screenplay editors.
/// This function converts the internal element representation to valid Fountain syntax.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array
/// * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
///
/// # Returns
///
/// Fountain-formatted string
///
/// # Example
///
/// ```javascript
/// const elements = [
///     { id: "1", element_type: "scene_heading", content: "INT. OFFICE - DAY" },
///     { id: "2", element_type: "action", content: "A busy office." },
/// ];
/// const metadata = { title: "My Script", author: "John Smith" };
///
/// const fountain = export_fountain(JSON.stringify(elements), JSON.stringify(metadata));
/// ```
#[wasm_bindgen]
pub fn export_fountain(elements_json: &str, metadata_json: &str) -> Result<String, JsError> {
    // Deserialize elements
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    // Parse optional metadata (empty string, "null", or "{}" all result in None)
    let metadata: Option<DocumentMetadata> = if metadata_json.is_empty()
        || metadata_json == "null"
        || metadata_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(metadata_json)
                .map_err(|e| JsError::new(&format!("Failed to parse metadata: {}", e)))?,
        )
    };

    // Export to Fountain format
    let fountain = export::export_to_fountain(&elements, metadata.as_ref());

    Ok(fountain)
}

/// Export elements to FDX (Final Draft) format
///
/// FDX is Final Draft's XML-based screenplay format, widely used in the
/// professional screenwriting industry. This function converts the internal
/// element representation to valid FDX syntax.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array
/// * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
///
/// # Returns
///
/// FDX-formatted XML string
///
/// # Example
///
/// ```javascript
/// const elements = [
///     { id: "1", element_type: "scene_heading", content: "INT. OFFICE - DAY" },
///     { id: "2", element_type: "action", content: "A busy office." },
///     { id: "3", element_type: "character", content: "JOHN" },
///     { id: "4", element_type: "dialogue", content: "Hello, is anyone here?" },
/// ];
/// const metadata = { title: "My Script", author: "John Smith" };
///
/// const fdx = export_fdx(JSON.stringify(elements), JSON.stringify(metadata));
/// // Save as .fdx file for Final Draft
/// ```
#[wasm_bindgen]
pub fn export_fdx(elements_json: &str, metadata_json: &str) -> Result<String, JsError> {
    // Deserialize elements
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    // Parse optional metadata (empty string, "null", or "{}" all result in None)
    let metadata: Option<DocumentMetadata> = if metadata_json.is_empty()
        || metadata_json == "null"
        || metadata_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(metadata_json)
                .map_err(|e| JsError::new(&format!("Failed to parse metadata: {}", e)))?,
        )
    };

    // Export to FDX format
    let fdx = export::export_to_fdx(&elements, metadata.as_ref());

    Ok(fdx)
}

/// Render paginated screenplay to a structure ready for PDF/print export
///
/// This function transforms PaginationResult into a RenderedDocument containing
/// all positions, text, and styling information needed by a PDF renderer.
/// The JavaScript side uses pdf-lib to create the actual PDF from this data.
///
/// # Arguments
///
/// * `elements_json` - JSON string of Element array
/// * `config_json` - JSON string of PageConfig used for pagination
/// * `pagination_result_json` - JSON string of PaginationResult from pagination
/// * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string to skip)
///
/// # Returns
///
/// JSON string of RenderedDocument with all positions and text ready for PDF rendering
///
/// # Example
///
/// ```javascript
/// // First paginate the document
/// const paginationResultJson = paginate_document_v3(elements, config, hasTitlePage, metadata);
///
/// // Then render for export
/// const renderedJson = render_for_export(
///     JSON.stringify(elements),
///     JSON.stringify(config),
///     paginationResultJson,
///     JSON.stringify(metadata)
/// );
///
/// // Use pdf-lib in JavaScript to create PDF from rendered data
/// const rendered = JSON.parse(renderedJson);
/// const pdf = await createPdfFromRendered(rendered);
/// ```
#[wasm_bindgen]
pub fn render_for_export(
    elements_json: &str,
    config_json: &str,
    pagination_result_json: &str,
    metadata_json: &str,
) -> Result<String, JsError> {
    // Deserialize elements
    let elements: Vec<Element> = serde_json::from_str(elements_json)
        .map_err(|e| JsError::new(&format!("Failed to parse elements: {}", e)))?;

    // Deserialize config
    let config: PageConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Failed to parse config: {}", e)))?;

    // Deserialize pagination result
    let pagination_result: PaginationResult = serde_json::from_str(pagination_result_json)
        .map_err(|e| JsError::new(&format!("Failed to parse pagination result: {}", e)))?;

    // Parse optional metadata (empty string, "null", or "{}" all result in None)
    let metadata: Option<DocumentMetadata> = if metadata_json.is_empty()
        || metadata_json == "null"
        || metadata_json == "{}"
    {
        None
    } else {
        Some(
            serde_json::from_str(metadata_json)
                .map_err(|e| JsError::new(&format!("Failed to parse metadata: {}", e)))?,
        )
    };

    // Render for export
    let rendered = export::render_for_export(&pagination_result, &elements, &config, metadata.as_ref());

    // Serialize to JSON
    serde_json::to_string(&rendered)
        .map_err(|e| JsError::new(&format!("Failed to serialize rendered document: {}", e)))
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

        assert_eq!(config.lines_per_page, 55);  // Final Draft standard
    }

    #[test]
    fn test_get_tv_one_hour_config() {
        let config_json = get_tv_one_hour_config().unwrap();
        let config: PageConfig = serde_json::from_str(&config_json).unwrap();

        assert_eq!(config.lines_per_page, 53);  // TV standard
    }

    #[test]
    fn test_get_tv_half_hour_config() {
        let config_json = get_tv_half_hour_config().unwrap();
        let config: PageConfig = serde_json::from_str(&config_json).unwrap();

        assert_eq!(config.lines_per_page, 53);  // Same as one-hour
    }

    #[test]
    fn test_get_tv_multi_cam_config() {
        let config_json = get_tv_multi_cam_config().unwrap();
        let config: PageConfig = serde_json::from_str(&config_json).unwrap();

        assert_eq!(config.lines_per_page, 53);  // TV standard
        // Verify double-spaced dialogue
        let dialogue_style = config.style_for(ElementType::Dialogue);
        assert_eq!(dialogue_style.line_spacing, 2.0);
    }

    #[test]
    fn test_calculate_element_lines() {
        let element_json = r#"{"id": "1", "element_type": "action", "content": "A short action."}"#;
        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let lines = calculate_element_lines(element_json, &config_json).unwrap();
        assert_eq!(lines, 1);
    }

    #[test]
    fn test_paginate_incremental_no_cache() {
        // First pagination without cache should work and return a cache
        let elements_json = r#"[
            {"id": "1", "element_type": "scene_heading", "content": "INT. OFFICE - DAY"},
            {"id": "2", "element_type": "action", "content": "A busy office."},
            {"id": "3", "element_type": "character", "content": "JOHN"},
            {"id": "4", "element_type": "dialogue", "content": "Hello world."}
        ]"#;

        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let result = paginate_document_incremental(
            elements_json,
            &config_json,
            false,
            "",  // no metadata
            "",  // no changes
            "",  // no cache
        ).unwrap();

        let parsed: PaginationResult = serde_json::from_str(&result).unwrap();

        // Should have one page with all elements
        assert_eq!(parsed.stats.page_count, 1);
        assert_eq!(parsed.stats.element_count, 4);

        // Should have a cache for subsequent calls
        assert!(parsed.cache.is_some());
        let cache = parsed.cache.unwrap();
        assert_eq!(cache.element_count, 4);
        assert!(!cache.page_boundaries.is_empty());
    }

    #[test]
    fn test_paginate_incremental_with_changes() {
        // Initial pagination
        let elements_json = r#"[
            {"id": "1", "element_type": "scene_heading", "content": "INT. OFFICE - DAY"},
            {"id": "2", "element_type": "action", "content": "A busy office."}
        ]"#;

        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let result1 = paginate_document_incremental(
            elements_json,
            &config_json,
            false,
            "",
            "",
            "",
        ).unwrap();

        let parsed1: PaginationResult = serde_json::from_str(&result1).unwrap();
        let cache = parsed1.cache.unwrap();
        let cache_json = serde_json::to_string(&cache).unwrap();

        // Now paginate with a change
        let changes_json = r#"[{"start_index": 1, "end_index": 2, "change_type": "modify"}]"#;

        let result2 = paginate_document_incremental(
            elements_json,
            &config_json,
            false,
            "",
            changes_json,
            &cache_json,
        ).unwrap();

        let parsed2: PaginationResult = serde_json::from_str(&result2).unwrap();

        // Should still produce correct result
        assert_eq!(parsed2.stats.page_count, 1);
        assert_eq!(parsed2.stats.element_count, 2);
        assert!(parsed2.cache.is_some());
    }

    #[test]
    fn test_paginate_incremental_config_change_invalidates_cache() {
        // Initial pagination with feature film config
        let elements_json = r#"[
            {"id": "1", "element_type": "scene_heading", "content": "INT. OFFICE - DAY"},
            {"id": "2", "element_type": "action", "content": "A busy office."}
        ]"#;

        let config1_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();

        let result1 = paginate_document_incremental(
            elements_json,
            &config1_json,
            false,
            "",
            "",
            "",
        ).unwrap();

        let parsed1: PaginationResult = serde_json::from_str(&result1).unwrap();
        let cache = parsed1.cache.unwrap();
        let cache_json = serde_json::to_string(&cache).unwrap();

        // Now paginate with different config (TV one hour has different lines_per_page)
        let config2_json = serde_json::to_string(&PageConfig::tv_one_hour()).unwrap();

        let result2 = paginate_document_incremental(
            elements_json,
            &config2_json,
            false,
            "",
            r#"[{"start_index": 0, "end_index": 1, "change_type": "modify"}]"#,
            &cache_json,
        ).unwrap();

        let parsed2: PaginationResult = serde_json::from_str(&result2).unwrap();

        // Should still work (full recalc due to config change)
        assert_eq!(parsed2.stats.element_count, 2);
        // Should have new cache with updated config hash
        assert!(parsed2.cache.is_some());
    }

    #[test]
    fn test_paginate_incremental_with_title_page() {
        let elements_json = r#"[
            {"id": "1", "element_type": "scene_heading", "content": "INT. OFFICE - DAY"},
            {"id": "2", "element_type": "action", "content": "A busy office."}
        ]"#;

        let config_json = serde_json::to_string(&PageConfig::feature_film()).unwrap();
        let metadata_json = r#"{"title": "My Script", "author": "Test Author"}"#;

        let result = paginate_document_incremental(
            elements_json,
            &config_json,
            true,  // has title page
            metadata_json,
            "",
            "",
        ).unwrap();

        let parsed: PaginationResult = serde_json::from_str(&result).unwrap();

        // Title page is page 1, content starts on page 2
        assert_eq!(parsed.stats.page_count, 2);  // title page + content page
        assert!(parsed.cache.is_some());
        let cache = parsed.cache.unwrap();
        assert!(cache.has_title_page);
    }
}
