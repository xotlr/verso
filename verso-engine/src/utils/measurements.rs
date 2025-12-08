/// Points per inch
pub const POINTS_PER_INCH: f64 = 72.0;

/// Courier 12pt character width in points
pub const COURIER_12PT_CHAR_WIDTH: f64 = 7.2;

/// Courier 12pt line height in points
pub const COURIER_12PT_LINE_HEIGHT: f64 = 12.0;

/// Convert inches to points
pub fn inches_to_points(inches: f64) -> f64 {
    inches * POINTS_PER_INCH
}

/// Convert points to inches
pub fn points_to_inches(points: f64) -> f64 {
    points / POINTS_PER_INCH
}

/// Calculate characters per line given available width in points
pub fn chars_per_line(width_pt: f64, char_width_pt: f64) -> usize {
    (width_pt / char_width_pt).floor() as usize
}

/// Calculate lines per page given available height in points
pub fn lines_per_page(height_pt: f64, line_height_pt: f64) -> usize {
    (height_pt / line_height_pt).floor() as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inches_to_points() {
        assert!((inches_to_points(1.0) - 72.0).abs() < 0.001);
        assert!((inches_to_points(1.5) - 108.0).abs() < 0.001);
    }

    #[test]
    fn test_points_to_inches() {
        assert!((points_to_inches(72.0) - 1.0).abs() < 0.001);
        assert!((points_to_inches(108.0) - 1.5).abs() < 0.001);
    }

    #[test]
    fn test_chars_per_line() {
        // US Letter with standard margins: 6" = 432pt
        // At 7.2pt per char = 60 chars
        assert_eq!(chars_per_line(432.0, 7.2), 60);
    }

    #[test]
    fn test_lines_per_page() {
        // Standard screenplay: ~55 lines per page
        // 9" printable height = 648pt
        // At 12pt per line = 54 lines
        assert_eq!(lines_per_page(648.0, 12.0), 54);
    }
}
