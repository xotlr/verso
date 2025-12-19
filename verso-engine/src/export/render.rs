//! Render module for preparing paginated screenplay for PDF export.
//!
//! This module transforms PaginationResult into a RenderedDocument structure
//! that contains all positions, text, and styling information needed by a
//! PDF renderer (like pdf-lib in JavaScript).
//!
//! The engine calculates everything; the renderer just draws.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::types::{
    DocumentMetadata, Element, ElementType, Page, PageConfig, PageIdentifier,
    PaginationResult, RevisionColor,
};

// ============================================================================
// Rendered Document Types
// ============================================================================

/// Font style for text rendering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FontStyle {
    Regular,
    Bold,
    Italic,
    BoldItalic,
}

/// A single text item to be rendered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextItem {
    /// X position in inches from left edge
    pub x: f64,
    /// Y position in inches from top edge
    pub y: f64,
    /// Text content (single line, already wrapped)
    pub text: String,
    /// Font style
    pub font_style: FontStyle,
    /// Original element type (for debugging/styling)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub element_type: Option<String>,
}

/// Scene number positioned on a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneNumber {
    /// Scene number text (e.g., "1", "2A")
    pub number: String,
    /// Y position in inches from top edge
    pub y: f64,
    /// Left X position (for left scene number)
    pub left_x: f64,
    /// Right X position (for right scene number)
    pub right_x: f64,
}

/// Page header information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageHeader {
    /// Page number/identifier to display
    pub page_number: String,
    /// X position for page number (right-aligned)
    pub page_number_x: f64,
    /// Y position for header
    pub y: f64,
    /// Optional revision indicator
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revision: Option<String>,
    /// X position for revision (left side)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revision_x: Option<f64>,
}

/// Continuation marker (MORE, CONT'D, CONTINUED)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContinuationMarker {
    /// Marker text
    pub text: String,
    /// X position in inches
    pub x: f64,
    /// Y position in inches
    pub y: f64,
    /// Font style
    pub font_style: FontStyle,
}

/// A rendered page ready for PDF export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedPage {
    /// Page identifier (for display)
    pub page_number: String,
    /// Whether this is a title page
    pub is_title_page: bool,
    /// Page header (not shown on title page)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header: Option<PageHeader>,
    /// Text items to render
    pub text_items: Vec<TextItem>,
    /// Scene numbers on this page
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub scene_numbers: Vec<SceneNumber>,
    /// Continuation markers
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub continuations: Vec<ContinuationMarker>,
}

/// Title page layout information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitlePageLayout {
    /// Title text
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<TextItem>,
    /// "written by" text
    #[serde(skip_serializing_if = "Option::is_none")]
    pub written_by: Option<TextItem>,
    /// Author name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<TextItem>,
    /// Draft information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub draft: Option<TextItem>,
    /// Date
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<TextItem>,
    /// Contact info (may be multiple lines)
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub contact: Vec<TextItem>,
    /// Copyright notice
    #[serde(skip_serializing_if = "Option::is_none")]
    pub copyright: Option<TextItem>,
    /// Revision indicator
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revision: Option<TextItem>,
}

/// Complete rendered document ready for PDF export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedDocument {
    /// Page width in inches
    pub page_width: f64,
    /// Page height in inches
    pub page_height: f64,
    /// Left margin in inches
    pub margin_left: f64,
    /// Right margin in inches
    pub margin_right: f64,
    /// Top margin in inches
    pub margin_top: f64,
    /// Bottom margin in inches
    pub margin_bottom: f64,
    /// Font size in points
    pub font_size: f64,
    /// Line height in points
    pub line_height: f64,
    /// Character width in inches (for Courier)
    pub char_width: f64,
    /// Title page layout (if present)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title_page: Option<TitlePageLayout>,
    /// Content pages
    pub pages: Vec<RenderedPage>,
    /// Total page count (including title page)
    pub total_pages: usize,
}

// ============================================================================
// Constants
// ============================================================================

/// Standard screenplay font size
const FONT_SIZE_PT: f64 = 12.0;
/// Line height equals font size for Courier
const LINE_HEIGHT_PT: f64 = 12.0;
/// Courier character width at 12pt (10 chars per inch)
const CHAR_WIDTH_INCHES: f64 = 0.1;
/// Points per inch
const POINTS_PER_INCH: f64 = 72.0;
/// Header Y position from top
const HEADER_Y_INCHES: f64 = 0.5;

// ============================================================================
// Main Render Function
// ============================================================================

/// Transform PaginationResult into a RenderedDocument for PDF export.
///
/// This function takes the pagination result (which contains page breaks and
/// element positions) and produces a structure with exact X/Y coordinates
/// for every text item, ready for a PDF renderer.
pub fn render_for_export(
    pagination_result: &PaginationResult,
    elements: &[Element],
    config: &PageConfig,
    metadata: Option<&DocumentMetadata>,
) -> RenderedDocument {
    // Build element lookup map
    let element_map: HashMap<&str, &Element> = elements
        .iter()
        .map(|e| (e.id.0.as_str(), e))
        .collect();

    // Page dimensions from config (convert from points to inches)
    let page_width = config.paper_size.width_pt() / POINTS_PER_INCH;
    let page_height = config.paper_size.height_pt() / POINTS_PER_INCH;

    // Margins in inches
    let margin_left = 1.5;  // Standard screenplay left margin
    let margin_right = 1.0; // Standard screenplay right margin
    let margin_top = 1.0;   // Standard top margin
    let margin_bottom = 1.0; // Standard bottom margin (for page numbers)

    // Calculate line height in inches
    let line_height_inches = LINE_HEIGHT_PT / POINTS_PER_INCH;

    // Determine if we have a title page
    let has_title_page = pagination_result.stats.layout.has_title_page
        && metadata.map(|m| !m.is_empty()).unwrap_or(false);

    // Render title page if present
    let title_page = if has_title_page {
        metadata.map(|m| render_title_page(m, page_width, page_height, margin_left, margin_right))
    } else {
        None
    };

    // Render content pages
    let mut rendered_pages: Vec<RenderedPage> = Vec::new();

    for page in &pagination_result.pages {
        // Skip the title page marker (page 0)
        if matches!(page.identifier, PageIdentifier::Sequential(0)) {
            continue;
        }

        let rendered = render_content_page(
            page,
            &element_map,
            config,
            metadata,
            margin_left,
            margin_top,
            line_height_inches,
        );
        rendered_pages.push(rendered);
    }

    let total_pages = if has_title_page {
        rendered_pages.len() + 1
    } else {
        rendered_pages.len()
    };

    RenderedDocument {
        page_width,
        page_height,
        margin_left,
        margin_right,
        margin_top,
        margin_bottom,
        font_size: FONT_SIZE_PT,
        line_height: LINE_HEIGHT_PT,
        char_width: CHAR_WIDTH_INCHES,
        title_page,
        pages: rendered_pages,
        total_pages,
    }
}

// ============================================================================
// Title Page Rendering
// ============================================================================

fn render_title_page(
    metadata: &DocumentMetadata,
    page_width: f64,
    page_height: f64,
    margin_left: f64,
    margin_right: f64,
) -> TitlePageLayout {
    let center_x = page_width / 2.0;

    // Title: centered, about 1/3 down the page
    let title = metadata.title.as_ref().map(|t| {
        let text = t.to_uppercase();
        let text_width = text.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: center_x - text_width / 2.0,
            y: page_height * 0.35,
            text,
            font_style: FontStyle::Bold,
            element_type: None,
        }
    });

    // "written by": centered, below title
    let written_by = metadata.author.as_ref().map(|_| {
        let text = "written by".to_string();
        let text_width = text.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: center_x - text_width / 2.0,
            y: page_height * 0.42,
            text,
            font_style: FontStyle::Regular,
            element_type: None,
        }
    });

    // Author: centered, below "written by"
    let author = metadata.author.as_ref().map(|a| {
        let text_width = a.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: center_x - text_width / 2.0,
            y: page_height * 0.45,
            text: a.clone(),
            font_style: FontStyle::Regular,
            element_type: None,
        }
    });

    // Draft info: lower right
    let right_edge = page_width - margin_right;
    let draft = metadata.draft.as_ref().map(|d| {
        let text_width = d.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: right_edge - text_width,
            y: page_height - 2.0,
            text: d.clone(),
            font_style: FontStyle::Regular,
            element_type: None,
        }
    });

    // Date: lower right, below draft
    let date = metadata.date.as_ref().map(|d| {
        let text_width = d.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: right_edge - text_width,
            y: page_height - 1.75,
            text: d.clone(),
            font_style: FontStyle::Regular,
            element_type: None,
        }
    });

    // Contact: lower left
    let contact: Vec<TextItem> = metadata
        .contact
        .as_ref()
        .map(|c| {
            c.lines()
                .enumerate()
                .map(|(i, line)| TextItem {
                    x: margin_left,
                    y: page_height - 2.0 + (i as f64 * LINE_HEIGHT_PT / POINTS_PER_INCH),
                    text: line.to_string(),
                    font_style: FontStyle::Regular,
                    element_type: None,
                })
                .collect()
        })
        .unwrap_or_default();

    // Copyright: lower left, below contact
    let copyright = metadata.copyright.as_ref().map(|c| TextItem {
        x: margin_left,
        y: page_height - 1.0,
        text: c.clone(),
        font_style: FontStyle::Regular,
        element_type: None,
    });

    // Revision indicator: lower right, below date
    let revision = metadata.revision_color.as_ref().map(|r| {
        let text = format!("{} REVISION", revision_color_name(r));
        let text_width = text.len() as f64 * CHAR_WIDTH_INCHES;
        TextItem {
            x: right_edge - text_width,
            y: page_height - 1.5,
            text,
            font_style: FontStyle::Regular,
            element_type: None,
        }
    });

    TitlePageLayout {
        title,
        written_by,
        author,
        draft,
        date,
        contact,
        copyright,
        revision,
    }
}

fn revision_color_name(color: &RevisionColor) -> &'static str {
    match color {
        RevisionColor::White => "WHITE",
        RevisionColor::Blue => "BLUE",
        RevisionColor::Pink => "PINK",
        RevisionColor::Yellow => "YELLOW",
        RevisionColor::Green => "GREEN",
        RevisionColor::Goldenrod => "GOLDENROD",
        RevisionColor::Buff => "BUFF",
        RevisionColor::Salmon => "SALMON",
        RevisionColor::Cherry => "CHERRY",
    }
}

// ============================================================================
// Content Page Rendering
// ============================================================================

fn render_content_page(
    page: &Page,
    element_map: &HashMap<&str, &Element>,
    config: &PageConfig,
    metadata: Option<&DocumentMetadata>,
    margin_left: f64,
    margin_top: f64,
    line_height_inches: f64,
) -> RenderedPage {
    let page_number = page.identifier.display();
    let page_width = config.paper_size.width_pt() / POINTS_PER_INCH;

    // Page header
    let header = Some(PageHeader {
        page_number: page_number.clone(),
        page_number_x: page_width - 1.0, // 1 inch from right edge
        y: HEADER_Y_INCHES,
        revision: metadata.and_then(|m| {
            m.revision_color
                .as_ref()
                .map(|r| format!("{} REVISION", revision_color_name(r)))
        }),
        revision_x: Some(margin_left),
    });

    // Render text items
    let mut text_items: Vec<TextItem> = Vec::new();
    let mut scene_numbers: Vec<SceneNumber> = Vec::new();
    let mut continuations: Vec<ContinuationMarker> = Vec::new();

    // Scene continuation at top
    if let Some(ref continued_top) = page.scene_continued_top {
        continuations.push(ContinuationMarker {
            text: continued_top.clone(),
            x: margin_left,
            y: margin_top - line_height_inches,
            font_style: FontStyle::Regular,
        });
    }

    // Content start Y
    let content_start_y = margin_top;

    // Render each element
    for page_element in &page.elements {
        if let Some(element) = element_map.get(page_element.element_id.0.as_str()) {
            // Get style for this element type
            let style = config.style_for(element.element_type);

            // Calculate X position
            let x = margin_left + style.margin_left;

            // Calculate Y position (line-based)
            let y = content_start_y + ((page_element.start_line as f64 - 1.0) * line_height_inches);

            // Get text lines
            let lines = get_element_lines(
                &element.content,
                style.max_chars_per_line,
                page_element.line_range.as_ref(),
            );

            // Determine font style
            let font_style = get_font_style(element.element_type, style.force_uppercase);

            // Handle continuation prefix (character name with CONT'D)
            let mut render_y = y;
            if let Some(ref prefix) = page_element.continuation_prefix {
                let char_style = config.style_for(ElementType::Character);
                let char_x = margin_left + char_style.margin_left;
                text_items.push(TextItem {
                    x: char_x,
                    y: render_y,
                    text: prefix.clone(),
                    font_style: FontStyle::Bold,
                    element_type: Some("character".to_string()),
                });
                render_y += line_height_inches;
            }

            // Render each line
            for line in &lines {
                let text = if style.force_uppercase {
                    line.to_uppercase()
                } else {
                    line.clone()
                };

                if !text.is_empty() {
                    text_items.push(TextItem {
                        x,
                        y: render_y,
                        text,
                        font_style,
                        element_type: Some(format!("{:?}", element.element_type).to_lowercase()),
                    });
                }
                render_y += line_height_inches * style.line_spacing;
            }

            // Scene numbers for scene headings
            if element.element_type == ElementType::SceneHeading {
                if let Some(ref num) = element.scene_number {
                    scene_numbers.push(SceneNumber {
                        number: num.clone(),
                        y,
                        left_x: margin_left - 0.5, // 0.5 inches left of margin
                        right_x: page_width - 0.75, // Near right edge
                    });
                }
            }
        }
    }

    // Bottom continuations
    if let Some(ref more) = page.bottom_continuation {
        let char_style = config.style_for(ElementType::Character);
        let char_x = margin_left + char_style.margin_left;
        let lines_per_page = config.lines_per_page as f64;
        let y = content_start_y + (lines_per_page * line_height_inches);
        continuations.push(ContinuationMarker {
            text: more.clone(),
            x: char_x,
            y,
            font_style: FontStyle::Regular,
        });
    }

    if let Some(ref continued_bottom) = page.scene_continued_bottom {
        let lines_per_page = config.lines_per_page as f64;
        let y = content_start_y + ((lines_per_page + 1.0) * line_height_inches);
        continuations.push(ContinuationMarker {
            text: continued_bottom.clone(),
            x: page_width - 2.0, // Right side
            y,
            font_style: FontStyle::Regular,
        });
    }

    RenderedPage {
        page_number,
        is_title_page: false,
        header,
        text_items,
        scene_numbers,
        continuations,
    }
}

fn get_font_style(element_type: ElementType, force_uppercase: bool) -> FontStyle {
    match element_type {
        ElementType::SceneHeading | ElementType::Transition => FontStyle::Bold,
        ElementType::Character => FontStyle::Bold,
        _ if force_uppercase => FontStyle::Bold,
        _ => FontStyle::Regular,
    }
}

// ============================================================================
// Text Processing Helpers
// ============================================================================

/// Strip HTML tags from content
fn strip_html(html: &str) -> String {
    if html.is_empty() {
        return String::new();
    }

    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;

    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }

    // Decode common HTML entities
    result
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

/// Wrap text to fit within max_chars per line
fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    if text.is_empty() {
        return vec![String::new()];
    }

    let mut lines = Vec::new();

    for paragraph in text.split('\n') {
        if paragraph.is_empty() {
            lines.push(String::new());
            continue;
        }

        let words: Vec<&str> = paragraph.split_whitespace().collect();
        if words.is_empty() {
            lines.push(String::new());
            continue;
        }

        let mut current_line = String::new();

        for word in words {
            if current_line.is_empty() {
                if word.len() > max_chars {
                    let mut remaining = word;
                    while remaining.len() > max_chars {
                        lines.push(remaining[..max_chars].to_string());
                        remaining = &remaining[max_chars..];
                    }
                    current_line = remaining.to_string();
                } else {
                    current_line = word.to_string();
                }
            } else if current_line.len() + 1 + word.len() <= max_chars {
                current_line.push(' ');
                current_line.push_str(word);
            } else {
                lines.push(current_line);
                current_line = word.to_string();
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }
    }

    if lines.is_empty() {
        lines.push(String::new());
    }

    lines
}

/// Get lines from element content, optionally slicing for split elements
fn get_element_lines(
    content: &str,
    max_chars: u8,
    line_range: Option<&crate::types::LineRange>,
) -> Vec<String> {
    let plain_text = strip_html(content);
    let all_lines = wrap_text(&plain_text, max_chars as usize);

    if let Some(range) = line_range {
        let start = range.start as usize;
        let end = (range.end as usize).min(all_lines.len());
        all_lines[start..end].to_vec()
    } else {
        all_lines
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html() {
        assert_eq!(strip_html("Hello <b>world</b>"), "Hello world");
        assert_eq!(strip_html(""), "");
        assert_eq!(strip_html("No tags"), "No tags");
        assert_eq!(strip_html("&amp; test"), "& test");
    }

    #[test]
    fn test_wrap_text() {
        let text = "This is a test of text wrapping functionality";
        let lines = wrap_text(text, 20);
        assert!(lines.len() > 1);
        for line in &lines {
            assert!(line.len() <= 20);
        }
    }

    #[test]
    fn test_wrap_text_empty() {
        let lines = wrap_text("", 20);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0], "");
    }

    #[test]
    fn test_revision_color_name() {
        assert_eq!(revision_color_name(&RevisionColor::Blue), "BLUE");
        assert_eq!(revision_color_name(&RevisionColor::Pink), "PINK");
        assert_eq!(revision_color_name(&RevisionColor::Cherry), "CHERRY");
    }

    #[test]
    fn test_font_style_serialization() {
        let style = FontStyle::BoldItalic;
        let json = serde_json::to_string(&style).unwrap();
        assert_eq!(json, "\"bolditalic\"");
    }

    #[test]
    fn test_text_item_creation() {
        let item = TextItem {
            x: 1.5,
            y: 2.0,
            text: "Hello".to_string(),
            font_style: FontStyle::Regular,
            element_type: Some("action".to_string()),
        };
        assert_eq!(item.x, 1.5);
        assert_eq!(item.text, "Hello");
    }

    #[test]
    fn test_render_empty_document() {
        let result = PaginationResult::new();
        let elements: Vec<Element> = vec![];
        let config = PageConfig::feature_film();

        let rendered = render_for_export(&result, &elements, &config, None);

        assert_eq!(rendered.page_width, 8.5);
        assert_eq!(rendered.page_height, 11.0);
        assert!(rendered.title_page.is_none());
        assert!(rendered.pages.is_empty());
    }
}
