/**
 * Onboarding Strategies
 * Contextual onboarding selection similar to greeting strategies
 *
 * ARCHITECTURE
 * ============
 * The onboarding system mirrors the greeting system's sophistication:
 *
 * 1. CONTEXT DETECTION: Device, time, user state
 * 2. STEP VARIANTS: Multiple versions of each step for variety
 * 3. SMART PICKING: Avoid recently shown variants
 * 4. PERSONALIZATION: Name-based and use-case-based customization
 *
 * STEP FLOW
 * ---------
 * 1. Welcome: Context-aware greeting
 * 2. Scene Heading: Core mechanic
 * 3. Tab Toggle: Workflow efficiency
 * 4. Autocomplete: Smart features
 * 5. Completion: Motivational send-off
 */

import { pickSmart, getTimePeriod, isWeekend as checkIsWeekend } from '../../utils';
import { matchName, getNameOnboarding } from '../names';
import type {
  OnboardingContext,
  OnboardingStepVariant,
  OnboardingResult,
} from './types';

// ============================================================================
// WELCOME VARIANTS
// ============================================================================

const welcomeVariants: OnboardingStepVariant[] = [
  {
    id: 'welcome-default',
    title: 'The blank page.',
    description: "Your favorite enemy. Let's fix that.",
    action: 'New Screenplay',
  },
  {
    id: 'welcome-morning',
    title: 'Morning pages.',
    description: "Fresh start. Let's write something.",
    action: 'New Screenplay',
  },
  {
    id: 'welcome-night',
    title: 'Late night writing.',
    description: 'When the world sleeps, writers work.',
    action: 'New Screenplay',
  },
  {
    id: 'welcome-weekend',
    title: 'Weekend project.',
    description: 'No meetings. No emails. Just pages.',
    action: 'New Screenplay',
  },
  {
    id: 'welcome-direct',
    title: 'Skip the tour?',
    description: "Fair. But here's the basics anyway.",
    action: 'New Screenplay',
  },
  {
    id: 'welcome-curious',
    title: 'First screenplay?',
    description: "Good. Everyone starts somewhere.",
    action: "Let's go",
  },
  {
    id: 'welcome-pro',
    title: 'Switching tools?',
    description: 'This one gets out of your way.',
    action: 'Show me',
  },
  {
    id: 'welcome-mobile',
    title: 'Writing on the go.',
    description: 'Brave. We respect it.',
    action: 'New Screenplay',
  },
];

// ============================================================================
// SCENE HEADING VARIANTS
// ============================================================================

const sceneHeadingVariants: OnboardingStepVariant[] = [
  {
    id: 'scene-default',
    title: 'Type INT. or EXT.',
    description: 'That starts your scene. We handle the formatting.',
    shortcut: 'INT.',
    highlight: '[data-element-type="scene-heading"]',
  },
  {
    id: 'scene-film',
    title: 'INT. COFFEE SHOP - DAY',
    description: 'Inside. Outside. Day. Night. That\'s your scene heading.',
    shortcut: 'INT. / EXT.',
  },
  {
    id: 'scene-example',
    title: 'Start with a location.',
    description: 'Type "INT." for inside or "EXT." for outside. We format it.',
    shortcut: 'INT.',
  },
  {
    id: 'scene-minimal',
    title: 'Scene headings.',
    description: 'Type int. → auto-formatted. That simple.',
    shortcut: 'int.',
  },
];

// ============================================================================
// TAB TOGGLE VARIANTS
// ============================================================================

const tabToggleVariants: OnboardingStepVariant[] = [
  {
    id: 'tab-default',
    title: 'Tab is your friend.',
    description: "It switches between action and dialogue. That's most of what you need.",
    shortcut: 'Tab',
  },
  {
    id: 'tab-workflow',
    title: 'The only shortcut you need.',
    description: 'Tab. It toggles between action and character. Done.',
    shortcut: 'Tab',
  },
  {
    id: 'tab-efficiency',
    title: 'One key. Two modes.',
    description: 'Tab switches between describing and talking. Flow.',
    shortcut: 'Tab',
  },
  {
    id: 'tab-minimal',
    title: 'Tab to talk.',
    description: 'Action → Character → Dialogue. Tab does the switching.',
    shortcut: 'Tab',
  },
];

// ============================================================================
// AUTOCOMPLETE VARIANTS
// ============================================================================

const autocompleteVariants: OnboardingStepVariant[] = [
  {
    id: 'auto-default',
    title: 'We remember character names.',
    description: 'Type a few letters. We suggest the rest.',
    highlight: '[data-autocomplete]',
  },
  {
    id: 'auto-smart',
    title: 'Smart suggestions.',
    description: 'Character names, locations, transitions. We learn as you write.',
  },
  {
    id: 'auto-speed',
    title: 'Less typing.',
    description: 'We remember your characters. Type "SA" → SARAH.',
  },
  {
    id: 'auto-flow',
    title: 'Stay in flow.',
    description: "Autocomplete handles the repetitive stuff. You handle the story.",
  },
];

// ============================================================================
// COMPLETION VARIANTS
// ============================================================================

const completionVariants: OnboardingStepVariant[] = [
  {
    id: 'done-default',
    title: "That's it.",
    description: 'Go write something.',
    action: 'Start Writing',
  },
  {
    id: 'done-minimal',
    title: 'Done.',
    description: 'No more tutorial. Just write.',
    action: 'Start Writing',
  },
  {
    id: 'done-encouraging',
    title: 'You got this.',
    description: 'The blank page is just a starting point.',
    action: 'Start Writing',
  },
  {
    id: 'done-dry',
    title: 'Setup complete.',
    description: 'The software is ready. Are you?',
    action: 'Start Writing',
  },
  {
    id: 'done-action',
    title: 'FADE IN.',
    description: 'Your turn.',
    action: 'Start Writing',
  },
  {
    id: 'done-weekend',
    title: 'Weekend mission.',
    description: 'One scene. One page. Go.',
    action: 'Start Writing',
  },
];

// ============================================================================
// CONTEXT DETECTION
// ============================================================================

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Build onboarding context from available data
 */
export function buildOnboardingContext(
  userName?: string | null,
  hasScreenplays = false,
  hasTeams = false,
  useCase?: 'film' | 'tv' | 'short' | 'student' | null
): OnboardingContext {
  return {
    userName,
    hasScreenplays,
    hasTeams,
    useCase,
    device: detectDevice(),
    timePeriod: getTimePeriod(),
    isWeekend: checkIsWeekend(),
    sessionSeed: Math.floor(Math.random() * 10000),
  };
}

// ============================================================================
// STEP SELECTION
// ============================================================================

function selectVariant(
  variants: OnboardingStepVariant[],
  context: OnboardingContext,
  recentIds: string[] = []
): OnboardingStepVariant {
  // Filter by context
  let filtered = [...variants];

  // Time-based filtering
  if (context.timePeriod === 'morning') {
    const morningVariant = variants.find((v) => v.id.includes('morning'));
    if (morningVariant) filtered = [morningVariant, ...filtered.filter((v) => v !== morningVariant)];
  }
  if (context.timePeriod === 'night') {
    const nightVariant = variants.find((v) => v.id.includes('night'));
    if (nightVariant) filtered = [nightVariant, ...filtered.filter((v) => v !== nightVariant)];
  }
  if (context.isWeekend) {
    const weekendVariant = variants.find((v) => v.id.includes('weekend'));
    if (weekendVariant) filtered = [weekendVariant, ...filtered.filter((v) => v !== weekendVariant)];
  }

  // Device-based filtering
  if (context.device === 'mobile') {
    const mobileVariant = variants.find((v) => v.id.includes('mobile'));
    if (mobileVariant) filtered = [mobileVariant, ...filtered.filter((v) => v !== mobileVariant)];
  }

  // Use smart picking to avoid recently shown
  const ids = filtered.map((v) => v.id);
  const selectedId = pickSmart(ids, recentIds, context.sessionSeed ?? Date.now());
  return filtered.find((v) => v.id === selectedId) || variants[0];
}

// ============================================================================
// WELCOME MESSAGE SELECTION
// ============================================================================

const welcomeMessages = [
  "Let's get you set up",
  'A few quick things first',
  'Welcome. This won\'t take long',
  'Ready when you are',
  'The basics. Then you write',
  'Quick intro. Promise',
  'Two minutes. Tops',
  'The tour, abridged',
];

const welcomeMessagesByTime: Record<string, string[]> = {
  morning: [
    'Morning. Quick intro',
    'Early bird. Quick tour',
    'Fresh start. Quick basics',
  ],
  afternoon: [
    'Afternoon. Quick tour',
    'Midday check-in',
    'Post-lunch productivity',
  ],
  evening: [
    'Evening session. Quick intro',
    'Golden hour. Quick tour',
  ],
  night: [
    'Late night. Quick basics',
    'Night owl mode. Quick tour',
    'Burning midnight oil',
  ],
};

function selectWelcomeMessage(context: OnboardingContext): string {
  // Check for name-based easter egg
  const nameMatch = matchName(context.userName);
  if (nameMatch) {
    const nameOnboarding = getNameOnboarding(nameMatch);
    if (nameOnboarding) return nameOnboarding;
  }

  // Time-based selection
  const timeMessages = welcomeMessagesByTime[context.timePeriod] || [];
  const allMessages = [...timeMessages, ...welcomeMessages];

  return pickSmart(allMessages, [], context.sessionSeed ?? Date.now());
}

// ============================================================================
// COMPLETION MESSAGE SELECTION
// ============================================================================

const completionMessages = [
  "You're all set",
  'Good to go',
  "That's it. Go write something",
  'Setup complete. The blank page awaits',
  'Ready. Now write',
  'Done. Your move',
  'Tour complete. Script pending',
  "That's the basics. The rest is you",
];

const completionMessagesByTime: Record<string, string[]> = {
  morning: [
    'Morning pages await',
    'Fresh day. Fresh pages',
  ],
  night: [
    'Night mode activated',
    'Quiet hours. Loud ideas',
  ],
  weekend: [
    'Weekend project unlocked',
    'Two days. Make them count',
  ],
};

function selectCompletionMessage(context: OnboardingContext): string {
  const timeKey = context.isWeekend ? 'weekend' : context.timePeriod;
  const timeMessages = completionMessagesByTime[timeKey] || [];
  const allMessages = [...timeMessages, ...completionMessages];

  return pickSmart(allMessages, [], context.sessionSeed ?? Date.now());
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Get contextual onboarding steps based on user context
 */
export function getContextualOnboarding(
  context: OnboardingContext,
  recentStepIds: string[] = []
): OnboardingResult {
  const steps: OnboardingStepVariant[] = [
    selectVariant(welcomeVariants, context, recentStepIds),
    selectVariant(sceneHeadingVariants, context, recentStepIds),
    selectVariant(tabToggleVariants, context, recentStepIds),
    selectVariant(autocompleteVariants, context, recentStepIds),
    selectVariant(completionVariants, context, recentStepIds),
  ];

  const variantId = steps.map((s) => s.id).join('-');

  return {
    steps,
    welcomeMessage: selectWelcomeMessage(context),
    completionMessage: selectCompletionMessage(context),
    variantId,
  };
}

/**
 * Get a single random welcome message (for simpler use cases)
 */
export function getRandomWelcome(userName?: string | null): string {
  const context = buildOnboardingContext(userName);
  return selectWelcomeMessage(context);
}

/**
 * Get a single random completion message
 */
export function getRandomCompletion(): string {
  const context = buildOnboardingContext();
  return selectCompletionMessage(context);
}
