use crate::types::{Element, PageConfig};

/// Result of calculating lines for an element
#[derive(Debug, Clone)]
pub struct LineCalculation {
    /// Lines for the content itself
    pub content_lines: u32,

    /// Space before (from element style)
    pub space_before: u8,

    /// Space after (from element style)
    pub space_after: u8,

    /// Total lines including spacing
    pub total_lines: u32,

    /// For split calculations: content of each wrapped line
    pub wrapped_lines: Vec<String>,
}

/// Calculates line counts for screenplay elements
pub struct LineCalculator<'a> {
    config: &'a PageConfig,
}

impl<'a> LineCalculator<'a> {
    pub fn new(config: &'a PageConfig) -> Self {
        Self { config }
    }

    /// Calculate how many lines an element requires
    pub fn calculate(&self, element: &Element) -> LineCalculation {
        let style = self.config.style_for(element.element_type);

        // Get max characters per line for this element type
        let chars_per_line = style.max_chars_per_line as usize;

        // Wrap text into lines
        let wrapped_lines = self.wrap_text(&element.content, chars_per_line);
        let content_lines = wrapped_lines.len() as u32;

        // Apply line spacing (for double-spaced formats like multi-cam)
        let spaced_lines = if style.line_spacing > 1.0 {
            ((content_lines as f64) * style.line_spacing).ceil() as u32
        } else {
            content_lines
        };

        // Calculate space before (only if not at start of page, handled by caller)
        let space_before = style.space_before;
        let space_after = style.space_after;

        LineCalculation {
            content_lines,
            space_before,
            space_after,
            total_lines: spaced_lines + space_after as u32,
            wrapped_lines,
        }
    }

    /// Calculate lines for an element including space_before
    pub fn calculate_with_spacing(&self, element: &Element, at_page_start: bool) -> LineCalculation {
        let mut calc = self.calculate(element);

        if !at_page_start {
            calc.total_lines += calc.space_before as u32;
        }

        calc
    }

    /// Word wrap text to fit within character limit
    fn wrap_text(&self, text: &str, chars_per_line: usize) -> Vec<String> {
        if chars_per_line == 0 {
            return vec![text.to_string()];
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
                    // First word on line
                    if word.len() > chars_per_line {
                        // Word itself is longer than line - force break
                        lines.extend(self.break_long_word(word, chars_per_line));
                    } else {
                        current_line = word.to_string();
                    }
                } else if current_line.len() + 1 + word.len() <= chars_per_line {
                    // Word fits on current line
                    current_line.push(' ');
                    current_line.push_str(word);
                } else {
                    // Word doesn't fit - start new line
                    lines.push(current_line);

                    if word.len() > chars_per_line {
                        lines.extend(self.break_long_word(word, chars_per_line));
                        current_line = String::new();
                    } else {
                        current_line = word.to_string();
                    }
                }
            }

            if !current_line.is_empty() {
                lines.push(current_line);
            }
        }

        // Ensure at least one line for non-empty content
        if lines.is_empty() && !text.is_empty() {
            lines.push(String::new());
        }

        lines
    }

    /// Break a word that's longer than a line
    fn break_long_word(&self, word: &str, chars_per_line: usize) -> Vec<String> {
        let mut lines = Vec::new();
        let mut remaining = word;

        while remaining.len() > chars_per_line {
            lines.push(remaining[..chars_per_line].to_string());
            remaining = &remaining[chars_per_line..];
        }

        if !remaining.is_empty() {
            lines.push(remaining.to_string());
        }

        lines
    }

    /// Calculate just the content lines without a full LineCalculation
    pub fn content_lines(&self, element: &Element) -> u32 {
        let style = self.config.style_for(element.element_type);
        let chars_per_line = style.max_chars_per_line as usize;
        self.wrap_text(&element.content, chars_per_line).len() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ElementId;

    fn make_config() -> PageConfig {
        PageConfig::feature_film()
    }

    fn make_element(element_type: ElementType, content: &str) -> Element {
        Element {
            id: ElementId::new("test"),
            element_type,
            content: content.to_string(),
            character_name: None,
            dual_dialogue_position: None,
            force_page_break_after: false,
        }
    }

    #[test]
    fn test_scene_heading_single_line() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        let element = make_element(ElementType::SceneHeading, "INT. OFFICE - DAY");
        let result = calc.calculate(&element);

        assert_eq!(result.content_lines, 1);
        assert_eq!(result.wrapped_lines.len(), 1);
    }

    #[test]
    fn test_action_wrapping() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        // Action has 60 chars per line
        let long_action = "A ".repeat(50); // 100 chars, should wrap to 2 lines
        let element = make_element(ElementType::Action, &long_action);
        let result = calc.calculate(&element);

        assert!(result.content_lines >= 2);
    }

    #[test]
    fn test_dialogue_wrapping() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        // Dialogue has 35 chars per line
        let dialogue = "This is a test dialogue that should definitely wrap to multiple lines because it is quite long.";
        let element = make_element(ElementType::Dialogue, dialogue);
        let result = calc.calculate(&element);

        // 95 chars / 35 chars = ~3 lines
        assert!(result.content_lines >= 2);
        assert!(result.content_lines <= 4);
    }

    #[test]
    fn test_empty_content() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        let element = make_element(ElementType::Action, "");
        let result = calc.calculate(&element);

        assert_eq!(result.content_lines, 0);
    }

    #[test]
    fn test_multiline_content() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        let element = make_element(ElementType::Action, "Line one.\nLine two.\nLine three.");
        let result = calc.calculate(&element);

        assert_eq!(result.content_lines, 3);
    }

    #[test]
    fn test_space_before() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        // Scene heading has space_before = 2
        let element = make_element(ElementType::SceneHeading, "INT. OFFICE - DAY");
        let result = calc.calculate(&element);

        assert_eq!(result.space_before, 2);
    }

    #[test]
    fn test_long_word_breaking() {
        let config = make_config();
        let calc = LineCalculator::new(&config);

        // A word longer than any line
        let very_long_word = "A".repeat(100);
        let element = make_element(ElementType::Dialogue, &very_long_word);
        let result = calc.calculate(&element);

        // 100 chars / 35 chars per line = 3 lines
        assert!(result.content_lines >= 3);
    }
}
