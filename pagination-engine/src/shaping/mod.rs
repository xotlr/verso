//! Font shaping module for deterministic text layout
//!
//! Uses allsorts for OpenType font parsing.
//! Embeds Courier Prime font for consistent cross-platform rendering.
//!
//! For monospace fonts like Courier Prime, we use simple character-to-glyph
//! mapping without complex OpenType shaping (no ligatures, no kerning needed).

use allsorts::binary::read::ReadScope;
use allsorts::font_data::FontData;
use allsorts::tables::cmap::{Cmap, CmapSubtable};
use allsorts::tables::{FontTableProvider, HeadTable, HheaTable, HmtxTable, MaxpTable};
use allsorts::tag;
use serde::{Deserialize, Serialize};

/// Embedded Courier Prime Regular font (OFL licensed)
static COURIER_PRIME_TTF: &[u8] = include_bytes!("../../fonts/CourierPrime-Regular.ttf");

/// Shaped glyph with position information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapedGlyph {
    /// Glyph ID in the font
    pub glyph_id: u16,
    /// Unicode codepoint this glyph represents
    pub codepoint: u32,
    /// Character index in the original string
    pub char_index: usize,
    /// Horizontal advance width in font units
    pub advance_width: i32,
    /// X offset adjustment (kerning, etc.)
    pub x_offset: i32,
    /// Y offset adjustment
    pub y_offset: i32,
}

/// Result of shaping a text string
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapedText {
    /// The shaped glyphs
    pub glyphs: Vec<ShapedGlyph>,
    /// Total advance width in font units
    pub total_advance: i32,
    /// Font units per em
    pub units_per_em: u16,
}

impl ShapedText {
    /// Convert total advance to points at a given font size
    pub fn width_in_points(&self, font_size_pt: f64) -> f64 {
        (self.total_advance as f64 / self.units_per_em as f64) * font_size_pt
    }
}

/// Font metrics extracted from the font
#[derive(Debug, Clone)]
pub struct FontMetrics {
    /// Units per em
    pub units_per_em: u16,
    /// Number of horizontal metrics entries
    pub num_h_metrics: u16,
    /// Advance widths for each glyph (up to num_h_metrics, then last one repeats)
    pub advance_widths: Vec<u16>,
    /// Default advance width (for monospace, all glyphs have same width)
    pub default_advance: u16,
}

/// Simple font context for monospace fonts
///
/// For Courier Prime (monospace), all glyphs have the same width,
/// so we only need to look up the default advance once.
pub struct FontContext {
    /// Font metrics
    metrics: FontMetrics,
    /// Cmap subtable for character to glyph mapping
    cmap_data: Vec<u8>,
}

impl FontContext {
    /// Create a new font context from TTF bytes
    pub fn new(font_bytes: &[u8]) -> Result<Self, String> {
        let scope = ReadScope::new(font_bytes);
        let font_file = scope.read::<FontData<'_>>()
            .map_err(|e| format!("Failed to parse font: {:?}", e))?;

        let provider = font_file.table_provider(0)
            .map_err(|e| format!("Failed to get table provider: {:?}", e))?;

        // Load HEAD table for units_per_em
        let head_data = provider.table_data(tag::HEAD)
            .map_err(|e| format!("Failed to read HEAD: {:?}", e))?
            .ok_or("HEAD table not found")?;
        let head = ReadScope::new(&head_data).read::<HeadTable>()
            .map_err(|e| format!("Failed to parse HEAD: {:?}", e))?;

        // Load MAXP for glyph count
        let maxp_data = provider.table_data(tag::MAXP)
            .map_err(|e| format!("Failed to read MAXP: {:?}", e))?
            .ok_or("MAXP table not found")?;
        let maxp = ReadScope::new(&maxp_data).read::<MaxpTable>()
            .map_err(|e| format!("Failed to parse MAXP: {:?}", e))?;

        // Load HHEA for number of h_metrics
        let hhea_data = provider.table_data(tag::HHEA)
            .map_err(|e| format!("Failed to read HHEA: {:?}", e))?
            .ok_or("HHEA table not found")?;
        let hhea = ReadScope::new(&hhea_data).read::<HheaTable>()
            .map_err(|e| format!("Failed to parse HHEA: {:?}", e))?;

        // Load HMTX for advance widths
        let hmtx_data = provider.table_data(tag::HMTX)
            .map_err(|e| format!("Failed to read HMTX: {:?}", e))?
            .ok_or("HMTX table not found")?;
        let hmtx = ReadScope::new(&hmtx_data).read_dep::<HmtxTable<'_>>((
            usize::from(maxp.num_glyphs),
            usize::from(hhea.num_h_metrics),
        )).map_err(|e| format!("Failed to parse HMTX: {:?}", e))?;

        // Extract advance widths
        let mut advance_widths = Vec::with_capacity(hhea.num_h_metrics as usize);
        for i in 0..hhea.num_h_metrics {
            let advance = hmtx.horizontal_advance(i, hhea.num_h_metrics)
                .unwrap_or(0);
            advance_widths.push(advance);
        }

        // For monospace fonts, all advances should be the same
        let default_advance = advance_widths.first().copied().unwrap_or(600);

        // Load CMAP data
        let cmap_data = provider.table_data(tag::CMAP)
            .map_err(|e| format!("Failed to read CMAP: {:?}", e))?
            .ok_or("CMAP table not found")?
            .into_owned();

        let metrics = FontMetrics {
            units_per_em: head.units_per_em,
            num_h_metrics: hhea.num_h_metrics,
            advance_widths,
            default_advance,
        };

        Ok(Self {
            metrics,
            cmap_data,
        })
    }

    /// Create from the embedded Courier Prime font
    pub fn courier_prime() -> Result<Self, String> {
        Self::new(COURIER_PRIME_TTF)
    }

    /// Get units per em
    pub fn units_per_em(&self) -> u16 {
        self.metrics.units_per_em
    }

    /// Get the default advance width (same for all glyphs in monospace)
    pub fn default_advance(&self) -> u16 {
        self.metrics.default_advance
    }

    /// Get advance width for a glyph
    pub fn get_advance_width(&self, glyph_id: u16) -> u16 {
        let idx = glyph_id.min(self.metrics.num_h_metrics.saturating_sub(1));
        self.metrics.advance_widths.get(idx as usize)
            .copied()
            .unwrap_or(self.metrics.default_advance)
    }

    /// Look up glyph ID for a character
    pub fn get_glyph_id(&self, codepoint: u32) -> Option<u16> {
        let scope = ReadScope::new(&self.cmap_data);
        let cmap = scope.read::<Cmap<'_>>().ok()?;

        // Try each encoding subtable to find the glyph
        for record in cmap.encoding_records() {
            let offset = record.offset as usize;
            if let Some(subtable_bytes) = self.cmap_data.get(offset..) {
                let subtable_scope = ReadScope::new(subtable_bytes);
                if let Ok(subtable) = subtable_scope.read::<CmapSubtable<'_>>() {
                    if let Ok(Some(glyph_id)) = subtable.map_glyph(codepoint) {
                        return Some(glyph_id);
                    }
                }
            }
        }

        None
    }

    /// Shape a text string into glyphs
    ///
    /// For monospace fonts, this is simple character-to-glyph mapping
    /// with uniform advance widths.
    pub fn shape_text(&self, text: &str) -> ShapedText {
        let mut glyphs = Vec::with_capacity(text.len());
        let mut total_advance = 0i32;
        let default_advance = self.metrics.default_advance as i32;

        for (char_index, ch) in text.chars().enumerate() {
            let codepoint = ch as u32;
            let glyph_id = self.get_glyph_id(codepoint).unwrap_or(0);

            // For monospace, all glyphs have same advance
            let advance_width = default_advance;

            glyphs.push(ShapedGlyph {
                glyph_id,
                codepoint,
                char_index,
                advance_width,
                x_offset: 0,
                y_offset: 0,
            });

            total_advance += advance_width;
        }

        ShapedText {
            glyphs,
            total_advance,
            units_per_em: self.metrics.units_per_em,
        }
    }

    /// Measure text width in points at a given font size
    pub fn measure_text(&self, text: &str, font_size_pt: f64) -> f64 {
        let shaped = self.shape_text(text);
        shaped.width_in_points(font_size_pt)
    }

    /// Measure text width using character count (fast path for monospace)
    pub fn measure_text_fast(&self, char_count: usize, font_size_pt: f64) -> f64 {
        let total_advance = (char_count as i32) * (self.metrics.default_advance as i32);
        (total_advance as f64 / self.metrics.units_per_em as f64) * font_size_pt
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_font_loading() {
        let ctx = FontContext::courier_prime().expect("Failed to load font");
        assert!(ctx.units_per_em() > 0);
        println!("Units per em: {}", ctx.units_per_em());
        println!("Default advance: {}", ctx.default_advance());
    }

    #[test]
    fn test_glyph_lookup() {
        let ctx = FontContext::courier_prime().expect("Failed to load font");

        // 'A' should have a glyph
        let glyph_id = ctx.get_glyph_id('A' as u32);
        assert!(glyph_id.is_some(), "Glyph for 'A' not found");
        println!("Glyph ID for 'A': {:?}", glyph_id);

        // Advance should be positive
        let advance = ctx.get_advance_width(glyph_id.unwrap());
        assert!(advance > 0);
        println!("Advance width: {}", advance);
    }

    #[test]
    fn test_text_shaping() {
        let ctx = FontContext::courier_prime().expect("Failed to load font");

        let shaped = ctx.shape_text("Hello");
        assert_eq!(shaped.glyphs.len(), 5);
        assert!(shaped.total_advance > 0);

        // At 12pt, "Hello" should be about 36pt wide (5 chars * ~7.2pt)
        let width = shaped.width_in_points(12.0);
        println!("Width of 'Hello' at 12pt: {}pt", width);
        assert!(width > 30.0 && width < 50.0, "Width was {}", width);
    }

    #[test]
    fn test_monospace_consistency() {
        let ctx = FontContext::courier_prime().expect("Failed to load font");

        // In monospace, 'M' and 'i' should have the same width
        let m_glyph = ctx.get_glyph_id('M' as u32).unwrap();
        let i_glyph = ctx.get_glyph_id('i' as u32).unwrap();

        let m_advance = ctx.get_advance_width(m_glyph);
        let i_advance = ctx.get_advance_width(i_glyph);

        println!("M advance: {}, i advance: {}", m_advance, i_advance);
        assert_eq!(m_advance, i_advance, "Monospace font should have equal widths");
    }

    #[test]
    fn test_measure_text_fast() {
        let ctx = FontContext::courier_prime().expect("Failed to load font");

        let width_shaped = ctx.measure_text("Hello", 12.0);
        let width_fast = ctx.measure_text_fast(5, 12.0);

        // Both methods should give the same result for monospace
        assert!((width_shaped - width_fast).abs() < 0.01,
            "Shaped: {}, Fast: {}", width_shaped, width_fast);
    }
}
