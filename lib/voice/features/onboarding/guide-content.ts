/**
 * Getting Started Guide Content
 * Single source of truth for onboarding, help pages, and public docs.
 *
 * Voice: Casual. Dry. Film-literate. Never corporate.
 */

export interface GuideSection {
  id: string;
  title: string;
  subtitle?: string;
  content: string[];
  example?: {
    before?: string;
    after: string;
    caption?: string;
  };
  tip?: string;
}

export interface GuideTip {
  shortcut: string;
  description: string;
}

// ============================================================================
// HERO / INTRO
// ============================================================================

export const heroContent = {
  headline: "Write screenplays. Skip the formatting.",
  subheadline: "Most screenwriting software makes you think about margins and tabs. We'd rather you think about your story.",
  cta: "Start writing",
};

export const introContent = {
  hook: [
    "Everyone has a great idea for a movie.",
    "You're actually doing something about it.",
    "Here's how to turn that idea into a script.",
  ],
  promise: "Type INT. and start writing. That's it.",
};

// ============================================================================
// GUIDE SECTIONS
// ============================================================================

export const guideSections: GuideSection[] = [
  {
    id: "scene-heading",
    title: "Start your scene",
    subtitle: "Scene headings, simplified",
    content: [
      "Type int. or ext. — we handle the rest.",
      "INT. means inside. EXT. means outside.",
      "Add your location, then a dash. We'll suggest times of day.",
      "Hit Enter for DAY, or pick another.",
    ],
    example: {
      after: "INT. COFFEE SHOP - DAY",
      caption: "That's a scene heading. You didn't format anything.",
    },
    tip: "Typing int. or ext. tells us you're writing a scene heading. Auto-capitalized. Auto-formatted.",
  },
  {
    id: "action",
    title: "Describe what's happening",
    subtitle: "Action lines",
    content: [
      "Hit Enter. You're in an action line.",
      "Describe the visual stuff. What do we see?",
      "Keep going or start dialogue.",
    ],
    example: {
      after: "Sarah enters, laptop under her arm. She scans the room for an empty table.",
      caption: "Action. The camera's POV. What's on screen.",
    },
  },
  {
    id: "dialogue",
    title: "Make them talk",
    subtitle: "Character + Dialogue",
    content: [
      "Hit Tab. Now you're writing a character name.",
      "Type the name. Hit Enter. Write what they say.",
      "Next time, we'll autocomplete character names.",
      "We remember things.",
    ],
    example: {
      after: `                    SARAH
I hate Mondays.`,
      caption: "Character name centered. Dialogue below. Classic.",
    },
    tip: "Tab turns an empty action line into a character element.",
  },
  {
    id: "parenthetical",
    title: "How they say it",
    subtitle: "Parentheticals (use sparingly)",
    content: [
      "Hit Tab after a character name. Or type ( in a dialogue line.",
      "These tell the actor how to deliver the line.",
      "Directors don't love these. Use them when it matters.",
    ],
    example: {
      after: `                    SARAH
                (under her breath)
I hate Mondays.`,
      caption: "The parenthetical. A hint, not a command.",
    },
  },
  {
    id: "next-scene",
    title: "New scene",
    subtitle: "Moving on",
    content: [
      "Ready for the next scene?",
      "Just type int. or ext. in an action line.",
      "New scene heading. Keep going.",
    ],
  },
];

// ============================================================================
// SHORTCUTS
// ============================================================================

export const shortcuts: GuideTip[] = [
  { shortcut: "Tab", description: "Toggle between action and character" },
  { shortcut: "Enter", description: "Next element (we pick the right one)" },
  { shortcut: "int. / ext.", description: "Auto scene heading" },
  { shortcut: "⌘/Ctrl + click", description: "Manual element picker" },
  { shortcut: "(", description: "Start a parenthetical in dialogue" },
];

// ============================================================================
// CLOSING
// ============================================================================

export const closingContent = {
  headline: "That's the basics.",
  lines: [
    "No menus to dig through.",
    "No formatting modes to switch.",
    "No friction between you and the page.",
  ],
  cta: "The blank page awaits.",
  ctaButton: "Start writing",
};

// ============================================================================
// ONBOARDING FLOW (step-by-step walkthrough)
// ============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  highlight?: string; // CSS selector or element to highlight
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "The blank page.",
    description: "Your favorite enemy. Let's fix that.",
    action: "New Screenplay",
  },
  {
    id: "scene-heading",
    title: "Type INT. or EXT.",
    description: "That starts your scene. We handle the formatting.",
    highlight: "[data-element-type='scene-heading']",
  },
  {
    id: "tab-toggle",
    title: "Tab is your friend.",
    description: "It switches between action and dialogue. That's most of what you need.",
  },
  {
    id: "autocomplete",
    title: "We remember character names.",
    description: "Type a few letters. We'll suggest the rest.",
    highlight: "[data-autocomplete]",
  },
  {
    id: "done",
    title: "That's it.",
    description: "Go write something.",
    action: "Start Writing",
  },
];

// ============================================================================
// WHAT WE ELIMINATED (differentiator messaging)
// ============================================================================

export const eliminatedContent = {
  headline: "What we got rid of",
  items: [
    { removed: "Format menus", replaced: "Type int. and go" },
    { removed: "Element dropdowns", replaced: "Tab to toggle" },
    { removed: "Manual margins", replaced: "Industry standard, always" },
    { removed: "Save buttons", replaced: "Auto-save, every keystroke" },
  ],
  closer: "Less thinking about software. More thinking about story.",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random variant if multiple exist
 */
export function pickVariant<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get guide section by ID
 */
export function getSection(id: string): GuideSection | undefined {
  return guideSections.find(s => s.id === id);
}
