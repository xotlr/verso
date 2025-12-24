import { ElementType } from '../schema';

export interface TestElement {
  type: ElementType;
  text: string;
}

/**
 * Sample screenplay content for automated typing tests.
 * Includes various element types to test all formatting scenarios.
 */
export const TEST_SCREENPLAY: TestElement[] = [
  { type: 'scene_heading', text: 'INT. COFFEE SHOP - DAY' },
  { type: 'action', text: 'A bustling morning crowd fills the small cafe. Steam rises from espresso machines. SARAH, 30s, sharp eyes behind thick-rimmed glasses, sits alone at a corner table.' },
  { type: 'character', text: 'SARAH' },
  { type: 'dialogue', text: 'I need to tell you something. Something I should have said a long time ago.' },
  { type: 'action', text: 'She stirs her coffee nervously. The spoon clinks against the ceramic.' },
  { type: 'character', text: 'JAMES' },
  { type: 'parenthetical', text: '(sitting down)' },
  { type: 'dialogue', text: 'You look like you have seen a ghost.' },
  { type: 'character', text: 'SARAH' },
  { type: 'dialogue', text: 'Maybe I have.' },
  { type: 'action', text: 'She slides a manila envelope across the table. James looks at it but does not touch it.' },
  { type: 'character', text: 'JAMES' },
  { type: 'dialogue', text: 'What is this?' },
  { type: 'character', text: 'SARAH' },
  { type: 'dialogue', text: 'Everything. The files, the recordings, the proof. It is all there.' },
  { type: 'transition', text: 'CUT TO:' },
  { type: 'scene_heading', text: 'EXT. CITY STREET - CONTINUOUS' },
  { type: 'action', text: 'Rain begins to fall. People rush for cover, umbrellas blooming like flowers across the sidewalk.' },
  { type: 'scene_heading', text: 'INT. POLICE STATION - NIGHT' },
  { type: 'action', text: 'Fluorescent lights hum overhead. DETECTIVE CHEN, 50s, weathered and tired, reviews case files at his cluttered desk.' },
  { type: 'character', text: 'DETECTIVE CHEN' },
  { type: 'dialogue', text: 'Run the prints again. There has to be something we are missing.' },
];

/**
 * Quick test - just a few elements for fast testing.
 */
export const QUICK_TEST: TestElement[] = [
  { type: 'scene_heading', text: 'INT. OFFICE - DAY' },
  { type: 'action', text: 'A simple room with a desk and chair.' },
  { type: 'character', text: 'JOHN' },
  { type: 'dialogue', text: 'Hello world.' },
];

/**
 * Stress test - long action lines to test pagination.
 */
export const STRESS_TEST: TestElement[] = [
  { type: 'scene_heading', text: 'INT. WAREHOUSE - NIGHT' },
  { type: 'action', text: 'The vast warehouse stretches into darkness. Rows upon rows of industrial shelving rise toward the ceiling, each loaded with unmarked crates. Water drips somewhere in the distance, the sound echoing off concrete walls. A single bare bulb flickers overhead, casting long shadows that dance and twist with each electrical surge. The air is thick with dust and the smell of old cardboard and machine oil. Footsteps approach from somewhere deep within the maze of aisles.' },
  { type: 'action', text: 'MARCUS emerges from between two towering shelf units. He moves with purpose, checking over his shoulder every few steps. His breath comes in short, visible puffs in the cold air. He carries a small black case, gripping it tight against his chest like a lifeline.' },
  { type: 'character', text: 'MARCUS' },
  { type: 'dialogue', text: 'Anyone there? I brought what you asked for. All of it. Every last document, every recording, every piece of evidence. Now it is your turn to hold up your end of the deal.' },
  { type: 'action', text: 'Silence. The dripping water seems louder now. Marcus turns in a slow circle, eyes scanning the darkness between the shelves.' },
];

/**
 * Get total character count for a test set.
 */
export function getTestCharacterCount(elements: TestElement[]): number {
  return elements.reduce((sum, el) => sum + el.text.length, 0);
}

/**
 * Get estimated typing duration at given chars per second.
 */
export function getEstimatedDuration(elements: TestElement[], charsPerSecond: number): number {
  const chars = getTestCharacterCount(elements);
  return Math.ceil(chars / charsPerSecond);
}

// Sample data for generating scripts
const LOCATIONS = [
  'APARTMENT', 'OFFICE', 'COFFEE SHOP', 'WAREHOUSE', 'POLICE STATION',
  'HOSPITAL', 'SCHOOL', 'BAR', 'RESTAURANT', 'HOTEL ROOM', 'PARKING GARAGE',
  'SUBWAY STATION', 'AIRPORT', 'CHURCH', 'COURTHOUSE', 'PRISON', 'BEDROOM',
  'LIVING ROOM', 'KITCHEN', 'BASEMENT', 'ROOFTOP', 'ALLEY', 'PARK', 'BEACH'
];

const TIMES = ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER', 'MOMENTS LATER'];

const CHARACTERS = [
  'SARAH', 'JAMES', 'DETECTIVE CHEN', 'MARCUS', 'EMILY', 'DAVID',
  'DR. WILLIAMS', 'OFFICER GARCIA', 'THE STRANGER', 'ANNA', 'MICHAEL',
  'KATE', 'THOMAS', 'LISA', 'ROBERT', 'JENNIFER', 'ALEX', 'MARIA'
];

const ACTION_TEMPLATES = [
  'The room is quiet. {char} enters, looking around cautiously.',
  '{char} paces back and forth, clearly agitated.',
  'A moment of silence. The tension is palpable.',
  '{char} sits down heavily, rubbing their temples.',
  'Outside, sirens wail in the distance. {char} glances toward the window.',
  'The phone RINGS. {char} hesitates before answering.',
  '{char} pulls out a worn photograph, studying it intently.',
  'Footsteps echo in the hallway. {char} freezes.',
  '{char} opens the drawer, revealing its contents.',
  'The clock on the wall ticks loudly in the silence.',
  '{char} takes a deep breath, steeling themselves for what comes next.',
  'Rain begins to fall outside, streaking the windows.',
  '{char} stands at the window, watching the street below.',
  'A door SLAMS somewhere in the building. {char} tenses.',
  'Papers are scattered across the desk. {char} sorts through them methodically.',
];

const DIALOGUE_TEMPLATES = [
  'I never meant for any of this to happen.',
  'You have to believe me. I had no choice.',
  'Where were you last night? And do not lie to me.',
  'We need to talk. It is important.',
  'I found something. Something that changes everything.',
  'How long have you known?',
  'This is not what it looks like.',
  'I trusted you. We all trusted you.',
  'There is something you need to see.',
  'Time is running out. We have to move now.',
  'I have been thinking about what you said.',
  'You were right. About all of it.',
  'What happens now?',
  'I am sorry. I am so sorry.',
  'Tell me the truth. For once in your life.',
];

/**
 * Generate a random element from an array.
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a full screenplay script of the specified page count.
 * Industry standard: ~1 page = ~120 words = ~600 chars
 *
 * @param pages Number of pages to generate (default: 100)
 * @returns Array of TestElement representing the script
 */
export function generateFullScript(pages: number = 100): TestElement[] {
  const elements: TestElement[] = [];
  const charsPerPage = 1500; // Approximate chars per page
  const targetChars = pages * charsPerPage;
  let currentChars = 0;
  let sceneCount = 0;

  // Seed the random generator for consistency
  const rand = () => Math.random();

  while (currentChars < targetChars) {
    sceneCount++;

    // Scene heading
    const isInterior = rand() > 0.4;
    const location = randomFrom(LOCATIONS);
    const time = randomFrom(TIMES);
    const heading = `${isInterior ? 'INT' : 'EXT'}. ${location} - ${time}`;
    elements.push({ type: 'scene_heading', text: heading });
    currentChars += heading.length;

    // 2-4 action/dialogue beats per scene
    const beatsInScene = 2 + Math.floor(rand() * 3);

    for (let beat = 0; beat < beatsInScene && currentChars < targetChars; beat++) {
      // Action line
      const char1 = randomFrom(CHARACTERS);
      const actionTemplate = randomFrom(ACTION_TEMPLATES);
      const action = actionTemplate.replace('{char}', char1);
      elements.push({ type: 'action', text: action });
      currentChars += action.length;

      // 50% chance of dialogue
      if (rand() > 0.5 && currentChars < targetChars) {
        elements.push({ type: 'character', text: char1 });
        currentChars += char1.length;

        // 30% chance of parenthetical
        if (rand() > 0.7) {
          const parenthetical = rand() > 0.5 ? '(beat)' : '(continuing)';
          elements.push({ type: 'parenthetical', text: parenthetical });
          currentChars += parenthetical.length;
        }

        const dialogue = randomFrom(DIALOGUE_TEMPLATES);
        elements.push({ type: 'dialogue', text: dialogue });
        currentChars += dialogue.length;

        // 40% chance of response
        if (rand() > 0.6 && currentChars < targetChars) {
          const char2 = randomFrom(CHARACTERS.filter(c => c !== char1));
          elements.push({ type: 'character', text: char2 });
          currentChars += char2.length;

          const response = randomFrom(DIALOGUE_TEMPLATES);
          elements.push({ type: 'dialogue', text: response });
          currentChars += response.length;
        }
      }
    }

    // 20% chance of transition between scenes
    if (rand() > 0.8 && sceneCount < pages) {
      const transition = rand() > 0.5 ? 'CUT TO:' : 'DISSOLVE TO:';
      elements.push({ type: 'transition', text: transition });
      currentChars += transition.length;
    }
  }

  return elements;
}

/**
 * Generate a burst test string of specified length.
 */
export function generateBurstContent(charCount: number): TestElement[] {
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(Math.ceil(charCount / 45)).slice(0, charCount);
  return [{ type: 'action', text }];
}

/**
 * Parse a screenplay markdown file into TestElement array.
 * Detects scene headings, characters, dialogue, parentheticals, action, and transitions.
 */
export function parseScreenplayMarkdown(content: string): TestElement[] {
  const elements: TestElement[] = [];
  const lines = content.split('\n');

  let i = 0;
  let lastWasCharacter = false;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines and metadata
    if (!line || line.startsWith('LOGLINE') || line.startsWith('ACT ') || line.startsWith('SUPER:') || line.startsWith('Written by')) {
      lastWasCharacter = false;
      i++;
      continue;
    }

    // Scene heading: starts with INT. or EXT. (may have number prefix like "1. INT.")
    const sceneMatch = line.match(/^(?:\d+\.\s*)?(?:TO\s+)?(INT\.|EXT\.)/i);
    if (sceneMatch) {
      // Clean up the scene heading - remove number prefix
      const cleanedLine = line.replace(/^\d+\.\s*(?:TO\s+)?/, '').trim();
      elements.push({ type: 'scene_heading', text: cleanedLine });
      lastWasCharacter = false;
      i++;
      continue;
    }

    // Transition: ends with TO: or is MATCH-CUT
    if (/^(CUT TO:|DISSOLVE TO:|FADE TO:|MATCH-CUT|SMASH CUT|TIME CUT)/i.test(line)) {
      elements.push({ type: 'transition', text: line });
      lastWasCharacter = false;
      i++;
      continue;
    }

    // Character name: ALL CAPS, possibly with (CONT'D) or (V.O.) or (O.S.)
    // Must be on its own line, typically short
    const charMatch = line.match(/^([A-Z][A-Z\s']+)(?:\s*\((?:CONT'D|V\.O\.|O\.S\.)\))?$/);
    if (charMatch && line.length < 40 && !line.includes('.') && !line.startsWith('THEN') && !line.startsWith('SOUND') && !line.startsWith('CLOSE') && !line.startsWith('WIDE') && !line.startsWith('AERIAL') && !line.startsWith('TRACKING') && !line.startsWith('EXTREME') && !line.startsWith('BLACK')) {
      elements.push({ type: 'character', text: line });
      lastWasCharacter = true;
      i++;
      continue;
    }

    // Parenthetical: starts with (
    if (line.startsWith('(') && line.endsWith(')')) {
      elements.push({ type: 'parenthetical', text: line });
      i++;
      continue;
    }

    // Dialogue: follows a character name
    if (lastWasCharacter) {
      elements.push({ type: 'dialogue', text: line });
      lastWasCharacter = false;
      i++;
      continue;
    }

    // Everything else is action
    elements.push({ type: 'action', text: line });
    lastWasCharacter = false;
    i++;
  }

  return elements;
}

// Cache for loaded LYRA screenplay
let lyraCache: TestElement[] | null = null;

/**
 * Load and parse LYRA.md screenplay.
 * Caches the result for subsequent calls.
 */
export async function loadLyraScreenplay(): Promise<TestElement[]> {
  if (lyraCache) {
    return lyraCache;
  }

  try {
    const response = await fetch('/docs/LYRA.md');
    if (!response.ok) {
      throw new Error(`Failed to load LYRA.md: ${response.status}`);
    }
    const content = await response.text();
    lyraCache = parseScreenplayMarkdown(content);
    return lyraCache;
  } catch (error) {
    console.error('[loadLyraScreenplay] Error:', error);
    // Return fallback content
    return TEST_SCREENPLAY;
  }
}
