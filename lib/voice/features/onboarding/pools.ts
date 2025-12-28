/**
 * Onboarding Copy Pools
 * Structured copy for onboarding flow
 */

// Welcome messages
export const welcomeMessages = [
  "Let's get you set up",
  "A few quick things first",
  "Welcome. This won't take long",
  "Ready when you are",
];

// Step messages - keyed by step ID
export const stepMessages: Record<string, string[]> = {
  profile: [
    "First, who are you?",
    "Let's start with basics",
  ],
  preferences: [
    "How do you like to work?",
    "Set it up your way",
  ],
  template: [
    "Pick a starting point",
    "Or start from scratch. Your call",
  ],
};

// Completion messages
export const completionMessages = [
  "You're all set",
  "Good to go",
  "That's it. Go write something",
  "Setup complete. The blank page awaits",
];

// Skip messages
export const skipMessages = [
  "Skipping ahead. Respect",
  "We can do this later",
  "Fair enough",
];

// Error recovery messages
export const errorMessages = [
  "Something went wrong. Try that again?",
  "Didn't work. One more time?",
  "Hmm. Let's try that again",
];
