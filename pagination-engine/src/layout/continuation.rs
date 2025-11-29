use crate::types::{Element, PageConfig};
use super::LineCalculation;

/// Result of splitting an element across pages
#[derive(Debug, Clone)]
pub struct SplitResult {
    /// Lines to show on current page
    pub first_part_lines: u32,

    /// Lines to show on next page
    pub second_part_lines: u32,

    /// Content lines for first part
    pub first_part_content: Vec<String>,

    /// Content lines for second part
    pub second_part_content: Vec<String>,

    /// Marker at bottom of page (e.g., "(MORE)")
    pub more_marker: Option<String>,

    /// Marker for character name on next page (e.g., "JOHN (CONT'D)")
    pub contd_prefix: Option<String>,
}

/// Manages dialogue continuation (MORE/CONT'D) logic
pub struct ContinuationManager<'a> {
    config: &'a PageConfig,
}

impl<'a> ContinuationManager<'a> {
    pub fn new(config: &'a PageConfig) -> Self {
        Self { config }
    }

    /// Split a dialogue element at a given line
    pub fn split_dialogue(
        &self,
        element: &Element,
        line_calc: &LineCalculation,
        split_at_line: u32,
    ) -> SplitResult {
        let continuation = &self.config.continuation_style;

        // Adjust split point if we need space for MORE marker
        let actual_split = if continuation.enabled {
            split_at_line
        } else {
            split_at_line
        };

        // Split the wrapped lines
        let actual_split = actual_split.min(line_calc.wrapped_lines.len() as u32) as usize;

        let first_part_content: Vec<String> = line_calc.wrapped_lines
            .iter()
            .take(actual_split)
            .cloned()
            .collect();

        let second_part_content: Vec<String> = line_calc.wrapped_lines
            .iter()
            .skip(actual_split)
            .cloned()
            .collect();

        // Build continuation markers
        let (more_marker, contd_prefix) = if continuation.enabled && !second_part_content.is_empty() {
            let more = Some(continuation.more_marker.clone());
            let contd = element.character_name.as_ref().map(|name| {
                format!("{} {}", name.to_uppercase(), continuation.contd_marker)
            });
            (more, contd)
        } else {
            (None, None)
        };

        SplitResult {
            first_part_lines: first_part_content.len() as u32,
            second_part_lines: second_part_content.len() as u32,
            first_part_content,
            second_part_content,
            more_marker,
            contd_prefix,
        }
    }

    /// Split an action element (no continuation markers, just raw split)
    pub fn split_action(
        &self,
        line_calc: &LineCalculation,
        split_at_line: u32,
    ) -> SplitResult {
        let actual_split = split_at_line.min(line_calc.wrapped_lines.len() as u32) as usize;

        let first_part_content: Vec<String> = line_calc.wrapped_lines
            .iter()
            .take(actual_split)
            .cloned()
            .collect();

        let second_part_content: Vec<String> = line_calc.wrapped_lines
            .iter()
            .skip(actual_split)
            .cloned()
            .collect();

        SplitResult {
            first_part_lines: first_part_content.len() as u32,
            second_part_lines: second_part_content.len() as u32,
            first_part_content,
            second_part_content,
            more_marker: None,
            contd_prefix: None,
        }
    }

    /// Check if continuation markers are enabled
    pub fn is_enabled(&self) -> bool {
        self.config.continuation_style.enabled
    }

    /// Get the MORE marker text
    pub fn more_marker(&self) -> &str {
        &self.config.continuation_style.more_marker
    }

    /// Get the CONT'D marker text
    pub fn contd_marker(&self) -> &str {
        &self.config.continuation_style.contd_marker
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ElementId, ElementType};

    fn make_config() -> PageConfig {
        PageConfig::feature_film()
    }

    fn make_dialogue(content: &str, character: &str) -> Element {
        Element {
            id: ElementId::new("test"),
            element_type: ElementType::Dialogue,
            content: content.to_string(),
            character_name: Some(character.to_string()),
            dual_dialogue_position: None,
            force_page_break_after: false,
        }
    }

    #[test]
    fn test_split_dialogue_with_continuation() {
        let config = make_config();
        let mgr = ContinuationManager::new(&config);

        let element = make_dialogue("Line one. Line two. Line three.", "JOHN");

        let line_calc = LineCalculation {
            content_lines: 3,
            space_before: 0,
            space_after: 0,
            total_lines: 3,
            wrapped_lines: vec![
                "Line one.".to_string(),
                "Line two.".to_string(),
                "Line three.".to_string(),
            ],
        };

        let result = mgr.split_dialogue(&element, &line_calc, 2);

        assert_eq!(result.first_part_lines, 2);
        assert_eq!(result.second_part_lines, 1);
        assert_eq!(result.more_marker, Some("(MORE)".to_string()));
        assert_eq!(result.contd_prefix, Some("JOHN (CONT'D)".to_string()));
    }

    #[test]
    fn test_split_with_empty_second_part() {
        let config = make_config();
        let mgr = ContinuationManager::new(&config);

        let element = make_dialogue("Short line", "JANE");

        let line_calc = LineCalculation {
            content_lines: 1,
            space_before: 0,
            space_after: 0,
            total_lines: 1,
            wrapped_lines: vec!["Short line".to_string()],
        };

        let result = mgr.split_dialogue(&element, &line_calc, 1);

        // No second part, so no continuation markers
        assert_eq!(result.second_part_lines, 0);
        assert!(result.more_marker.is_none());
        assert!(result.contd_prefix.is_none());
    }
}
