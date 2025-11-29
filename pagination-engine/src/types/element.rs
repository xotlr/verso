use serde::{Deserialize, Serialize};

/// Unique identifier for each element, used for position tracking
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ElementId(pub String);

impl ElementId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }
}

/// All possible screenplay element types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ElementType {
    SceneHeading,
    Action,
    Character,
    Dialogue,
    Parenthetical,
    Transition,
    Shot,
    DualDialogueLeft,
    DualDialogueRight,
    ActBreak,
    PageBreak,
    BlankLine,
}

impl Default for ElementType {
    fn default() -> Self {
        Self::Action
    }
}

/// A single screenplay element with its content and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Element {
    pub id: ElementId,
    pub element_type: ElementType,
    pub content: String,

    /// Character name for dialogue/parenthetical (for CONT'D tracking)
    #[serde(default)]
    pub character_name: Option<String>,

    /// Whether this element is part of a dual dialogue block
    #[serde(default)]
    pub dual_dialogue_position: Option<DualDialoguePosition>,

    /// Whether this element forces a page break after it
    #[serde(default)]
    pub force_page_break_after: bool,
}

impl Element {
    pub fn new(id: impl Into<String>, element_type: ElementType, content: impl Into<String>) -> Self {
        Self {
            id: ElementId::new(id),
            element_type,
            content: content.into(),
            character_name: None,
            dual_dialogue_position: None,
            force_page_break_after: false,
        }
    }

    pub fn with_character_name(mut self, name: impl Into<String>) -> Self {
        self.character_name = Some(name.into());
        self
    }

    pub fn with_force_page_break(mut self) -> Self {
        self.force_page_break_after = true;
        self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DualDialoguePosition {
    Left,
    Right,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_element_creation() {
        let element = Element::new("1", ElementType::SceneHeading, "INT. OFFICE - DAY");
        assert_eq!(element.id.0, "1");
        assert_eq!(element.element_type, ElementType::SceneHeading);
        assert_eq!(element.content, "INT. OFFICE - DAY");
    }

    #[test]
    fn test_element_with_character() {
        let element = Element::new("2", ElementType::Dialogue, "Hello there!")
            .with_character_name("JOHN");
        assert_eq!(element.character_name, Some("JOHN".to_string()));
    }
}
