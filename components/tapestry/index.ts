// Re-export from v2 (pure React implementation)
export { Tapestry } from '../tapestry-v2';

// Supporting components (shared between v1 and v2)
export { TapestryToolbar } from './tapestry-toolbar';
export { NoteEditorDialog } from './note-editor-dialog';
export { EntitySidebar } from './EntitySidebar';
export { Minimap } from './Minimap';
export { CharacterProfilePanel } from './character-profile-panel';

// Legacy D3 implementation (deprecated, will be removed)
export { Tapestry as TapestryLegacy } from './tapestry';
