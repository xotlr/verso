//! Layout constants for pagination calculations.
//!
//! These constants define the standard DPI and conversion factors used
//! throughout the pagination engine. They must match the CSS values used
//! in the frontend for pixel-perfect rendering.

/// Standard screen DPI for pixel calculations
pub const DPI: f64 = 96.0;

/// Points to pixels conversion factor (96 DPI / 72 points per inch)
pub const PT_TO_PX: f64 = DPI / 72.0;

/// Gap between pages in pixels (must match CSS PAGE_GAP_PX)
pub const PAGE_GAP_PX: f32 = 40.0;

/// Convert points to pixels at 96 DPI.
///
/// This is the standard conversion used throughout the pagination engine
/// to ensure consistent rendering across browser, server, and PDF export.
///
/// # Example
///
/// ```
/// use verso_pagination_engine::layout::points_to_pixels;
///
/// let line_height_pt = 12.0;
/// let line_height_px = points_to_pixels(line_height_pt);
/// assert!((line_height_px - 16.0).abs() < 0.001);
/// ```
#[inline]
pub fn points_to_pixels(pt: f64) -> f32 {
    (pt * PT_TO_PX) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_points_to_pixels_12pt() {
        // 12pt at 96 DPI = 16px
        let px = points_to_pixels(12.0);
        assert!((px - 16.0).abs() < 0.001);
    }

    #[test]
    fn test_points_to_pixels_72pt() {
        // 72pt at 96 DPI = 96px (1 inch)
        let px = points_to_pixels(72.0);
        assert!((px - 96.0).abs() < 0.001);
    }

    #[test]
    fn test_page_gap_matches_css() {
        // PAGE_GAP_PX should be 40px to match CSS
        assert_eq!(PAGE_GAP_PX, 40.0);
    }
}
