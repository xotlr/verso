/**
 * Onboarding Copy Pools
 * Structured copy for onboarding flow
 *
 * Voice: Casual. Dry. Film-literate. Never corporate.
 * Pool sizes: 8+ variants per category for good variety.
 */

// Welcome messages - general
export const welcomeMessages = [
  "Let's get you set up",
  "A few quick things first",
  "Welcome. This won't take long",
  "Ready when you are",
  "The basics. Then you write",
  "Quick intro. Promise",
  "Two minutes. Tops",
  "The tour, abridged",
];

// Welcome messages - time-based
export const welcomeMessagesByTime: Record<string, string[]> = {
  morning: [
    "Morning. Quick intro",
    "Early bird. Quick tour",
    "Fresh start. Quick basics",
    "FADE IN on a new writer",
  ],
  afternoon: [
    "Afternoon. Quick tour",
    "Midday check-in",
    "Post-lunch productivity",
    "Prime time. Quick basics",
  ],
  evening: [
    "Evening session. Quick intro",
    "Golden hour. Quick tour",
    "End of day. Quick basics",
  ],
  night: [
    "Late night. Quick basics",
    "Night owl mode. Quick tour",
    "Burning midnight oil",
    "The graveyard shift begins",
  ],
};

// Step messages - keyed by step ID
export const stepMessages: Record<string, string[]> = {
  profile: [
    "First, who are you?",
    "Let's start with basics",
    "Quick intro",
    "The name on the title page",
  ],
  preferences: [
    "How do you like to work?",
    "Set it up your way",
    "Your preferences",
    "Customize or don't. Your call",
  ],
  template: [
    "Pick a starting point",
    "Or start from scratch. Your call",
    "Blank page or template?",
    "Start with structure or go freeform",
  ],
  'scene-heading': [
    "Type INT. or EXT.",
    "Inside or outside. Day or night",
    "Scene headings. The basics",
    "Where and when. That's a scene heading",
  ],
  'tab-toggle': [
    "Tab is your friend",
    "One key. Two modes",
    "The only shortcut you need",
    "Tab to talk. Tab to describe",
  ],
  autocomplete: [
    "We remember character names",
    "Smart suggestions as you type",
    "Less typing. More writing",
    "Type a few letters. We finish it",
  ],
};

// Completion messages
export const completionMessages = [
  "You're all set",
  "Good to go",
  "That's it. Go write something",
  "Setup complete. The blank page awaits",
  "Ready. Now write",
  "Done. Your move",
  "Tour complete. Script pending",
  "That's the basics. The rest is you",
];

// Completion messages - contextual
export const completionMessagesByContext: Record<string, string[]> = {
  morning: [
    "Morning pages await",
    "Fresh day. Fresh pages",
    "Rise and write",
  ],
  night: [
    "Night mode activated",
    "Quiet hours. Loud ideas",
    "When the world sleeps",
  ],
  weekend: [
    "Weekend project unlocked",
    "Two days. Make them count",
    "No excuses. Write",
  ],
  firstTime: [
    "Every writer starts here",
    "Page one. Scene one. You",
    "The journey begins",
  ],
};

// Skip messages
export const skipMessages = [
  "Skipping ahead. Respect",
  "We can do this later",
  "Fair enough",
  "Impatient. We get it",
  "Straight to writing. Bold",
  "Skip button user. Noted",
  "Tour skipped. No judgment",
  "The scenic route isn't for everyone",
];

// Error recovery messages
export const errorMessages = [
  "Something went wrong. Try that again?",
  "Didn't work. One more time?",
  "Hmm. Let's try that again",
  "That didn't land. Retry?",
  "Technical difficulties. Classic",
  "Not our finest moment. Try again?",
  "The demo gods are fickle. Retry",
  "Glitch in the matrix. Once more?",
];

// Encouragement messages (for mid-onboarding motivation)
export const encouragementMessages = [
  "Almost there",
  "One more step",
  "Nearly done",
  "Last thing",
  "Final step",
  "Home stretch",
  "Quick one",
  "Then you write",
];
