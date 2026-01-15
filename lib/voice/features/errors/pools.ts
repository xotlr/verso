/**
 * Error Message Pools
 * Voiced error messages organized by context
 *
 * Voice: Like Caine but less unhinged. Casual. Dry. Sometimes weird. Never corporate.
 * Errors should be: clear, actionable, not blame-y, occasionally wry
 */

import type { VoicedError } from './types';

/**
 * Generic fallback errors
 */
export const genericErrors: VoicedError[] = [
  { message: "That didn't work", action: 'Try again?' },
  { message: 'Something broke', action: 'Give it another shot' },
  { message: 'Hmm. Unexpected', action: 'Try that again' },
  { message: "Well, that's not right", action: 'One more time?' },
  { message: 'Glitch in the matrix', action: 'Try again' },
  { message: "That wasn't supposed to happen", action: 'Retry?' },
  { message: 'Technical difficulties', action: 'Try once more' },
  { message: 'Hit a snag', action: 'Try again?' },
];

/**
 * Network/connection errors
 */
export const networkErrors: VoicedError[] = [
  { message: 'Lost connection', action: 'Check your internet' },
  { message: "Can't reach the server", action: 'Are you online?' },
  { message: 'The internet went somewhere', action: 'Check your connection' },
  { message: 'Network hiccup', action: 'Try again when connected' },
  { message: 'Connection dropped', action: "We'll retry when you're back" },
  { message: 'Offline mode activated (not by choice)', action: 'Reconnect to continue' },
  { message: 'The wifi gods are not pleased', action: 'Check your connection' },
  { message: 'Signal lost', action: 'Reconnect and try again' },
];

/**
 * Authentication errors
 */
export const authErrors: VoicedError[] = [
  { message: 'Session expired', action: 'Sign in again' },
  { message: 'Credentials not recognized', action: 'Check your email and password' },
  { message: "We don't recognize that login", action: 'Try again or reset password' },
  { message: 'Not signed in', action: 'Log in to continue' },
  { message: 'Login required', action: 'Sign in first' },
  { message: 'Your session timed out', action: 'Sign back in' },
  { message: "That password didn't match", action: 'Try again or reset it' },
  { message: "Email or password's off", action: 'Double-check and retry' },
];

/**
 * Permission/access denied errors
 */
export const permissionErrors: VoicedError[] = [
  { message: "You don't have access to this", action: 'Request access from the owner' },
  { message: "Not your screenplay (yet)", action: 'Ask for an invite' },
  { message: 'Access denied', action: 'Contact the owner' },
  { message: "This isn't shared with you", action: 'Request access' },
  { message: 'Off limits', action: 'Need permission for this' },
  { message: 'Restricted area', action: 'Contact the team owner' },
  { message: "Can't go there", action: "You'll need access first" },
];

/**
 * Not found errors
 */
export const notFoundErrors: VoicedError[] = [
  { message: "That doesn't exist", action: 'Check the link?' },
  { message: 'Gone. Vanished. Poof', action: 'It might have been deleted' },
  { message: "Can't find it", action: 'May have been moved or deleted' },
  { message: 'Nothing here', action: 'Double-check the URL' },
  { message: '404: Screenplay not found', action: "It's not where we expected" },
  { message: "Doesn't exist anymore", action: 'Might have been removed' },
  { message: 'The void stares back', action: 'This page is empty' },
  { message: 'Missing', action: 'Check if it was deleted' },
];

/**
 * Validation errors - generic form validation
 */
export const validationErrors: VoicedError[] = [
  { message: 'Missing something', action: 'Check the required fields' },
  { message: "That doesn't look right", action: 'Check your input' },
  { message: 'Invalid input', action: 'Fix the highlighted fields' },
  { message: 'Needs work', action: 'Review the form' },
  { message: 'Not quite', action: 'Check the format' },
  { message: 'Something needs fixing', action: 'See the errors above' },
];

/**
 * Rate limit errors
 */
export const rateLimitErrors: VoicedError[] = [
  { message: 'Slow down', action: 'Wait a moment and try again' },
  { message: 'Too fast', action: 'Take a breath, then retry' },
  { message: 'Rate limited', action: 'Try again in a minute' },
  { message: 'Whoa there', action: "Wait a bit, we're catching up" },
  { message: 'One at a time', action: 'Give it a second' },
  { message: 'Easy on the refresh', action: 'Wait a moment' },
  { message: 'Hit the limit', action: 'Try again shortly' },
];

/**
 * File upload/import errors
 */
export const uploadErrors: VoicedError[] = [
  { message: "Couldn't read that file", action: 'Try a different format' },
  { message: "That file's not cooperating", action: 'Check the file and retry' },
  { message: 'Import failed', action: 'Make sure the file is valid' },
  { message: 'Upload interrupted', action: 'Try uploading again' },
  { message: "File didn't make it", action: 'Try again?' },
  { message: "Can't parse that", action: 'Check the file format' },
  { message: "That file's being difficult", action: 'Try another file' },
  { message: 'Upload hiccup', action: 'Give it another shot' },
];

/**
 * File export/download errors
 */
export const exportErrors: VoicedError[] = [
  { message: 'Export failed', action: 'Try a different format?' },
  { message: "Couldn't generate the file", action: 'Retry the export' },
  { message: 'Download interrupted', action: 'Try again' },
  { message: "PDF didn't render", action: 'Give it another shot' },
  { message: 'Export hit a wall', action: 'Try exporting again' },
  { message: 'The export broke', action: 'Different format might work' },
];

/**
 * Save errors
 */
export const saveErrors: VoicedError[] = [
  { message: "Couldn't save that", action: 'Try again' },
  { message: 'Save failed', action: 'Your changes might not be saved' },
  { message: "Changes didn't stick", action: 'Retry saving' },
  { message: 'Save interrupted', action: 'Try once more' },
  { message: "That didn't save", action: 'Check your connection and retry' },
  { message: 'Lost the changes', action: 'They might still be there. Refresh?' },
];

/**
 * Load errors
 */
export const loadErrors: VoicedError[] = [
  { message: "Couldn't load that", action: 'Refresh the page' },
  { message: 'Failed to fetch', action: 'Try reloading' },
  { message: "Data didn't arrive", action: 'Check your connection' },
  { message: "Can't load right now", action: 'Try again in a moment' },
  { message: 'Loading failed', action: 'Refresh to retry' },
  { message: "Page didn't load fully", action: 'Refresh?' },
];

/**
 * Delete errors
 */
export const deleteErrors: VoicedError[] = [
  { message: "Couldn't delete that", action: 'Try again' },
  { message: "It's still there", action: 'Retry the delete' },
  { message: 'Delete failed', action: 'Give it another shot' },
  { message: "Didn't delete", action: 'Refresh and try again' },
  { message: 'Deletion interrupted', action: 'Try once more' },
];

/**
 * Create errors
 */
export const createErrors: VoicedError[] = [
  { message: "Couldn't create that", action: 'Try again' },
  { message: 'Creation failed', action: 'Give it another shot' },
  { message: "Didn't get created", action: 'Try once more' },
  { message: "That didn't work", action: 'Retry?' },
  { message: 'Failed to create', action: 'Try again?' },
];

/**
 * Update errors
 */
export const updateErrors: VoicedError[] = [
  { message: "Changes didn't save", action: 'Try again' },
  { message: 'Update failed', action: 'Retry the change' },
  { message: "Couldn't update that", action: 'Give it another shot' },
  { message: "That change didn't take", action: 'Try once more' },
  { message: 'Update interrupted', action: 'Try again?' },
];

/**
 * Conflict errors (duplicates, etc.)
 */
export const conflictErrors: VoicedError[] = [
  { message: 'Already exists', action: 'Choose a different name' },
  { message: 'Name taken', action: 'Try something else' },
  { message: 'Conflict detected', action: 'Someone else edited this. Refresh?' },
  { message: 'Duplicate', action: 'That already exists' },
  { message: "Can't have two of those", action: 'Pick a unique name' },
  { message: 'Someone beat you to it', action: 'Refresh and try again' },
];

/**
 * Timeout errors
 */
export const timeoutErrors: VoicedError[] = [
  { message: 'Took too long', action: 'Try again?' },
  { message: 'Timed out', action: 'The server is busy. Retry?' },
  { message: 'Request expired', action: 'Give it another shot' },
  { message: "We waited, but...", action: 'Try again' },
  { message: 'Operation timed out', action: 'Retry in a moment' },
];

/**
 * Server errors (500s)
 */
export const serverErrors: VoicedError[] = [
  { message: 'Server hiccup', action: 'Try again in a moment' },
  { message: "Something broke on our end", action: "We're on it. Try again?" },
  { message: 'Internal error', action: 'Not you, us. Retry?' },
  { message: 'Backend trouble', action: 'Give it a minute' },
  { message: 'Our fault', action: 'Try again shortly' },
  { message: 'Server drama', action: "We're fixing it" },
];

/**
 * File parsing errors
 */
export const parseErrors: VoicedError[] = [
  { message: "Couldn't read that file format", action: 'Try a different format' },
  { message: "That file's structure is... creative", action: 'Check the format?' },
  { message: 'Parse error', action: 'File might be corrupted' },
  { message: "Can't make sense of that file", action: 'Try exporting it differently' },
  { message: "The file's not quite right", action: 'Check for corruption' },
  { message: 'Format not recognized', action: 'Try .fdx, .fountain, or .pdf' },
];

/**
 * Payment/subscription errors
 */
export const paymentErrors: VoicedError[] = [
  { message: 'Payment failed', action: 'Check your card details' },
  { message: "Card didn't work", action: 'Try a different card' },
  { message: "Couldn't process payment", action: 'Check with your bank' },
  { message: 'Subscription issue', action: 'Update your payment method' },
  { message: 'Billing hiccup', action: 'Check your payment info' },
  { message: "Transaction didn't go through", action: 'Try again or use different card' },
];

/**
 * Domain-specific error messages
 */
export const domainErrors: Record<string, VoicedError[]> = {
  screenplay: [
    { message: "Screenplay's not loading", action: 'Refresh the page' },
    { message: "Can't open that screenplay", action: 'Try again' },
    { message: 'Screenplay error', action: 'Refresh and retry' },
  ],
  project: [
    { message: 'Project not found', action: 'It might have been deleted' },
    { message: "Couldn't load the project", action: 'Refresh?' },
  ],
  stack: [
    { message: 'Stack operation failed', action: 'Try again' },
    { message: "Couldn't modify the stack", action: 'Refresh and retry' },
  ],
  team: [
    { message: "Team action didn't work", action: 'Try again' },
    { message: "Couldn't update team", action: 'Refresh?' },
  ],
  profile: [
    { message: "Profile update failed", action: 'Try saving again' },
    { message: "Couldn't load profile", action: 'Refresh the page' },
  ],
  export: [
    { message: 'Export failed', action: 'Try a different format' },
    { message: "Couldn't generate export", action: 'Retry?' },
  ],
  import: [
    { message: 'Import failed', action: 'Check the file format' },
    { message: "File didn't import", action: 'Try again' },
  ],
  shotlist: [
    { message: "Shotlist didn't save", action: 'Try again' },
    { message: "Can't update shotlist", action: 'Refresh and retry' },
  ],
  feedback: [
    { message: "Feedback didn't send", action: 'Try once more' },
    { message: "Couldn't submit feedback", action: 'Try again?' },
  ],
  invite: [
    { message: "Invite didn't send", action: 'Try again' },
    { message: "Couldn't send invite", action: 'Check the email and retry' },
  ],
  share: [
    { message: "Couldn't generate link", action: 'Try again' },
    { message: 'Share failed', action: 'Retry?' },
  ],
  general: [
    { message: "That didn't work", action: 'Try again' },
  ],
};

/**
 * Specific action failure messages
 * Use these for "Failed to X" replacements
 */
export const actionFailures: Record<string, string[]> = {
  load: [
    "Couldn't load that",
    'Loading failed',
    "That didn't load",
    'Failed to fetch',
  ],
  save: [
    "Didn't save",
    'Save failed',
    "Couldn't save that",
    "Changes didn't stick",
  ],
  create: [
    "Couldn't create that",
    'Creation failed',
    "Didn't get created",
  ],
  delete: [
    "Couldn't delete that",
    "Didn't delete",
    'Delete failed',
  ],
  update: [
    "Couldn't update that",
    'Update failed',
    "Changes didn't save",
  ],
  export: [
    'Export failed',
    "Couldn't export",
    "Export didn't work",
  ],
  import: [
    'Import failed',
    "Couldn't import",
    "Import didn't work",
  ],
  send: [
    "Didn't send",
    "Couldn't send that",
    'Send failed',
  ],
  copy: [
    "Couldn't copy",
    'Copy failed',
    "Didn't copy",
  ],
  move: [
    "Couldn't move that",
    'Move failed',
    "Didn't move",
  ],
  rename: [
    "Couldn't rename",
    'Rename failed',
    "Didn't rename",
  ],
  archive: [
    "Couldn't archive",
    'Archive failed',
    "Didn't archive",
  ],
  restore: [
    "Couldn't restore",
    'Restore failed',
    "Didn't restore",
  ],
  duplicate: [
    "Couldn't duplicate",
    'Duplicate failed',
    "Didn't duplicate",
  ],
  reorder: [
    "Couldn't reorder",
    'Reorder failed',
    "Order didn't save",
  ],
};
