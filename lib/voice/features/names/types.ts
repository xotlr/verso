/**
 * Name Recognition Types
 */

export type NameTone = 'playful' | 'reverent' | 'hostile' | 'chaotic';

export interface NamePersonality {
  /** Patterns to match (lowercase) */
  match: string[];
  /** Override displayed name (e.g., Tarantino → "Roman Polanski") */
  displayName?: string;
  /** Personality tone for this name */
  tone: NameTone;
  /** Chance of triggering (0-1). 1.0 = always */
  frequency: number;
  /** Special greeting pool for this name */
  greetings: string[];
  /** Special onboarding messages (optional) */
  onboarding?: string[];
}

export interface NameMatch {
  /** The registry key that matched */
  key: string;
  /** The full personality config */
  personality: NamePersonality;
  /** Display name to use (original or override) */
  displayName: string;
}

/** Internal entry with key for indexing */
export interface NameEntry extends NamePersonality {
  key: string;
}
