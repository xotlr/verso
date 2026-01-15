/**
 * Name Easter Egg Configuration System
 *
 * This module provides a config-driven approach to managing easter eggs.
 * Benefits:
 * - Easier for non-engineers to add/edit names
 * - Runtime validation
 * - Hot-reloading potential in development
 * - Clear schema documentation
 *
 * USAGE
 * -----
 * To add a new easter egg:
 * 1. Add entry to customNames below, or
 * 2. Call registerName() at runtime, or
 * 3. Load from external config via loadNamesFromConfig()
 *
 * SCHEMA
 * ------
 * {
 *   id: 'unique-id',
 *   match: ['name', 'alternate name', ...],
 *   tone: 'playful' | 'reverent' | 'chaotic' | 'hostile',
 *   frequency: 0.0 - 1.0,  // How often to trigger (1.0 = always)
 *   greetings: ['greeting 1', 'greeting 2', ...],
 *   onboarding?: ['onboarding message'],  // Optional
 *   category?: 'director' | 'writer' | 'actor' | 'creator' | 'character' | 'other'
 * }
 */

import type { NamePersonality } from './types';

// ============================================================================
// CONFIG SCHEMA
// ============================================================================

export interface NameConfig {
  /** Unique identifier */
  id: string;
  /** Names to match (lowercase) */
  match: string[];
  /** Personality tone */
  tone: 'playful' | 'reverent' | 'chaotic' | 'hostile';
  /** Trigger frequency (0.0 - 1.0) */
  frequency: number;
  /** Greeting messages */
  greetings: string[];
  /** Optional onboarding override */
  onboarding?: string[];
  /** Category for filtering/analytics */
  category?: 'director' | 'writer' | 'actor' | 'creator' | 'character' | 'other';
  /** Optional description (for docs/admin) */
  description?: string;
  /** Whether this is enabled */
  enabled?: boolean;
}

// ============================================================================
// RUNTIME REGISTRY
// ============================================================================

const runtimeRegistry = new Map<string, NameConfig>();

/**
 * Register a name at runtime
 */
export function registerName(config: NameConfig): void {
  if (!validateNameConfig(config)) {
    console.warn(`[VoiceNames] Invalid config for ${config.id}`);
    return;
  }
  runtimeRegistry.set(config.id, config);
}

/**
 * Unregister a name
 */
export function unregisterName(id: string): boolean {
  return runtimeRegistry.delete(id);
}

/**
 * Get all registered names
 */
export function getRegisteredNames(): NameConfig[] {
  return Array.from(runtimeRegistry.values()).filter((c) => c.enabled !== false);
}

/**
 * Clear runtime registry
 */
export function clearRegistry(): void {
  runtimeRegistry.clear();
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a name config
 */
export function validateNameConfig(config: Partial<NameConfig>): config is NameConfig {
  if (!config.id || typeof config.id !== 'string') return false;
  if (!Array.isArray(config.match) || config.match.length === 0) return false;
  if (!['playful', 'reverent', 'chaotic', 'hostile'].includes(config.tone || '')) return false;
  if (typeof config.frequency !== 'number' || config.frequency < 0 || config.frequency > 1) return false;
  if (!Array.isArray(config.greetings) || config.greetings.length === 0) return false;
  return true;
}

/**
 * Validate an array of configs
 */
export function validateConfigs(configs: Partial<NameConfig>[]): NameConfig[] {
  return configs.filter(validateNameConfig);
}

// ============================================================================
// LOADER
// ============================================================================

/**
 * Load names from a config array
 */
export function loadNamesFromConfig(configs: NameConfig[]): void {
  const valid = validateConfigs(configs);
  for (const config of valid) {
    runtimeRegistry.set(config.id, config);
  }
  console.log(`[VoiceNames] Loaded ${valid.length} name configs`);
}

/**
 * Convert legacy registry to config format
 */
export function convertLegacyToConfig(
  legacy: Record<string, NamePersonality>
): NameConfig[] {
  return Object.entries(legacy).map(([id, personality]) => ({
    id,
    match: personality.match,
    tone: personality.tone,
    frequency: personality.frequency,
    greetings: personality.greetings,
    onboarding: personality.onboarding,
    category: 'other' as const,
    enabled: true,
  }));
}

// ============================================================================
// CUSTOM NAMES (easy to edit)
// ============================================================================

/**
 * Custom name overrides - add your own here!
 * These take precedence over the legacy registry.
 */
export const customNames: NameConfig[] = [
  // Example of adding a new name:
  // {
  //   id: 'my-friend',
  //   match: ['friend name', 'friend nickname'],
  //   tone: 'playful',
  //   frequency: 1.0,
  //   greetings: ['Custom greeting for my friend!'],
  //   category: 'other',
  //   enabled: true,
  // },
];

// Load custom names on module init
if (customNames.length > 0) {
  loadNamesFromConfig(customNames);
}

// ============================================================================
// STATS
// ============================================================================

/**
 * Get statistics about the name registry
 */
export function getRegistryStats(): {
  total: number;
  byCategory: Record<string, number>;
  byTone: Record<string, number>;
  averageFrequency: number;
} {
  const names = getRegisteredNames();

  const byCategory: Record<string, number> = {};
  const byTone: Record<string, number> = {};
  let totalFrequency = 0;

  for (const name of names) {
    const category = name.category || 'other';
    byCategory[category] = (byCategory[category] || 0) + 1;
    byTone[name.tone] = (byTone[name.tone] || 0) + 1;
    totalFrequency += name.frequency;
  }

  return {
    total: names.length,
    byCategory,
    byTone,
    averageFrequency: names.length > 0 ? totalFrequency / names.length : 0,
  };
}
