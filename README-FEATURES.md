# Screenwriter App - Enhanced Features

## New Features Added

### 1. Fixed Editor Bugs
- **Deletion Bug Fix**: The editor no longer adds content when deleting text
- **Auto-formatting Fix**: Scene headings and action lines are no longer incorrectly converted to dialogue
- **Improved Text Processing**: Better handling of copy/paste and text input

### 2. Context Menu
Right-click anywhere in the editor to access formatting options:
- **Format as Scene Heading**: Converts text to INT./EXT. format
- **Format as Character**: Converts to uppercase character name
- **Format as Dialogue**: Formats as character dialogue
- **Format as Parenthetical**: Adds parentheses for stage directions
- **Format as Action**: Formats as action description
- **Format as Transition**: Formats as scene transition (CUT TO:, etc.)
- **Bold/Italic**: Apply text styling (also supports Cmd/Ctrl+B/I)

### 3. Character Visualization Page
Access from the editor toolbar to see:
- **Character Timeline**: Visual representation of when each character appears in scenes
- **Dialogue Count**: Number of dialogue lines per character per scene
- **Character Journey**: Detailed scene-by-scene breakdown for selected characters
- **Character Interactions Matrix**: Shows which characters appear together and how often

### 4. Claude AI Integration
Click the "AI Analysis" button in the editor toolbar to:
- **Full Analysis**: Get comprehensive screenplay breakdown including genre, structure, characters, and themes
- **Score & Rating**: Receive detailed scoring (1-10) across multiple dimensions:
  - Structure & Pacing
  - Character Development
  - Dialogue Quality
  - Visual Storytelling
  - Theme & Meaning
- **Improvement Suggestions**: Get specific, actionable feedback for enhancing your screenplay

## How to Use

### Context Menu
1. Right-click anywhere in the editor
2. Select the formatting option you want
3. The text at your cursor (or selected text) will be formatted accordingly

### Character Visualization
1. Click the "Visualize" button in the editor toolbar
2. View the character timeline and interactions
3. Click on any character to see their detailed journey
4. Use the interaction matrix to understand character relationships

### Claude AI Analysis
1. Click "AI Analysis" in the editor toolbar
2. Enter your Anthropic API key (get one from https://console.anthropic.com)
3. Select the type of analysis you want
4. Click "Analyze Screenplay" and wait for results
5. Export the analysis as a text file if needed

## Technical Improvements

### Enhanced Editor Component
- Better cursor position management
- Improved content rendering without losing focus
- Prevention of auto-formatting loops
- More reliable text input handling

### API Integration
- Secure API key handling (can use environment variable or user input)
- Support for different Claude models
- Error handling and loading states
- Export functionality for analysis results

## Keyboard Shortcuts
- **Cmd/Ctrl + S**: Save screenplay
- **Cmd/Ctrl + B**: Bold selected text
- **Cmd/Ctrl + I**: Italic selected text
- **Tab**: Quick format based on context

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. (Optional) Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```
4. Run the development server: `npm run dev`
5. Open http://localhost:3000 in your browser

## Future Enhancements
- PDF export with proper screenplay formatting
- Real-time collaboration features
- More detailed scene analysis
- Character arc visualization
- Dialogue analysis and consistency checking