/**
 * SSO Configuration Utilities
 *
 * Handles SSO setup, validation, and domain-based routing.
 * Note: Actual SAML/OIDC authentication is handled by Supabase Auth.
 *
 * Security: OIDC client secrets are encrypted at application level
 * before database storage using AES-256-GCM.
 */

import { createServerActionClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { encryptFields, decryptFields } from '@/lib/encryption';
import type { TeamSsoSettings, SsoStatus, SsoProvider, SamlConfig, OidcConfig } from './types';

export * from './types';

// Fields that contain sensitive data and should be encrypted
const SENSITIVE_SSO_FIELDS = ['clientSecret'];

// Result types for Supabase queries (columns added via migration, not in generated types)
interface TeamSsoRow {
  ssoEnabled: boolean;
  ssoProvider: string | null;
  ssoConfig: Record<string, unknown> | null;
  ssoDomain: string | null;
  ssoEnforced: boolean;
}

interface TeamIdSsoProviderRow {
  id: string;
  ssoProvider: string | null;
}

/**
 * Validate email domain format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation (e.g., acme.com, sub.domain.org)
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validate SAML configuration
 */
function validateSamlConfig(config: unknown): config is SamlConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;

  return (
    typeof c.entityId === 'string' &&
    c.entityId.length > 0 &&
    typeof c.ssoUrl === 'string' &&
    c.ssoUrl.startsWith('https://') &&
    typeof c.certificate === 'string' &&
    c.certificate.includes('-----BEGIN CERTIFICATE-----')
  );
}

/**
 * Validate OIDC configuration
 */
function validateOidcConfig(config: unknown): config is OidcConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;

  return (
    typeof c.issuer === 'string' &&
    c.issuer.startsWith('https://') &&
    typeof c.clientId === 'string' &&
    c.clientId.length > 0 &&
    typeof c.clientSecret === 'string' &&
    c.clientSecret.length > 0
  );
}

/**
 * Get SSO status for a team
 */
export async function getTeamSsoStatus(teamId: string): Promise<SsoStatus> {
  const supabase = await createServerActionClient();

  // Type assertion needed: SSO columns added via migration, not in generated types
  const { data: team, error } = await supabase
    .from('Team')
    .select('ssoEnabled, ssoProvider, ssoConfig, ssoDomain, ssoEnforced')
    .eq('id', teamId)
    .single() as { data: TeamSsoRow | null; error: Error | null };

  if (error || !team) {
    logger.error('Failed to get team SSO status', error ? new Error(error.message) : undefined, { teamId });
    throw new Error('Team not found');
  }

  // Decrypt sensitive fields in SSO config if present
  let ssoConfig = team.ssoConfig;
  if (ssoConfig && team.ssoProvider === 'oidc') {
    try {
      ssoConfig = decryptFields(ssoConfig as Record<string, unknown>, SENSITIVE_SSO_FIELDS);
    } catch (err) {
      logger.error('Failed to decrypt SSO config', err instanceof Error ? err : new Error(String(err)), { teamId });
    }
  }

  const hasValidConfig =
    team.ssoProvider === 'saml'
      ? validateSamlConfig(ssoConfig)
      : team.ssoProvider === 'oidc'
        ? validateOidcConfig(ssoConfig)
        : false;

  return {
    enabled: team.ssoEnabled ?? false,
    provider: team.ssoProvider as SsoProvider | null,
    domain: team.ssoDomain,
    enforced: team.ssoEnforced ?? false,
    configured: hasValidConfig,
  };
}

/**
 * Update SSO configuration for a team
 */
export async function updateTeamSsoConfig(
  teamId: string,
  settings: Partial<TeamSsoSettings>
): Promise<SsoStatus> {
  const supabase = await createServerActionClient();

  // Validate domain if provided
  if (settings.ssoDomain && !isValidDomain(settings.ssoDomain)) {
    throw new Error('Invalid email domain format');
  }

  // Validate config if provider and config are provided
  if (settings.ssoProvider && settings.ssoConfig) {
    if (settings.ssoProvider === 'saml' && !validateSamlConfig(settings.ssoConfig)) {
      throw new Error('Invalid SAML configuration');
    }
    if (settings.ssoProvider === 'oidc' && !validateOidcConfig(settings.ssoConfig)) {
      throw new Error('Invalid OIDC configuration');
    }
  }

  // Don't allow enabling without config
  if (settings.ssoEnabled === true) {
    const currentStatus = await getTeamSsoStatus(teamId);
    const newConfig = settings.ssoConfig ?? (currentStatus.configured ? 'existing' : null);
    if (!newConfig) {
      throw new Error('Cannot enable SSO without valid configuration');
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (settings.ssoEnabled !== undefined) updates.ssoEnabled = settings.ssoEnabled;
  if (settings.ssoProvider !== undefined) updates.ssoProvider = settings.ssoProvider;
  if (settings.ssoConfig !== undefined) {
    // Encrypt sensitive fields before storing OIDC config
    let configToStore = settings.ssoConfig;
    if (settings.ssoProvider === 'oidc' && configToStore) {
      configToStore = encryptFields(configToStore as Record<string, unknown>, SENSITIVE_SSO_FIELDS);
    }
    updates.ssoConfig = configToStore;
  }
  if (settings.ssoDomain !== undefined) updates.ssoDomain = settings.ssoDomain;
  if (settings.ssoEnforced !== undefined) updates.ssoEnforced = settings.ssoEnforced;

  // Type assertion needed: SSO columns added via migration
  const { error } = await (supabase.from('Team') as ReturnType<typeof supabase.from>)
    .update(updates)
    .eq('id', teamId);

  if (error) {
    logger.error('Failed to update SSO config', new Error(error.message), { teamId });
    throw new Error('Failed to update SSO configuration');
  }

  return getTeamSsoStatus(teamId);
}

/**
 * Check if an email domain has SSO configured
 * Used for routing users to the correct IdP
 */
export async function getTeamByEmailDomain(domain: string): Promise<{ teamId: string; ssoProvider: SsoProvider } | null> {
  const supabase = await createServerActionClient();

  // Type assertion needed: SSO columns added via migration
  const { data: team, error } = await supabase
    .from('Team')
    .select('id, ssoProvider')
    .eq('ssoDomain', domain.toLowerCase())
    .eq('ssoEnabled', true)
    .single() as { data: TeamIdSsoProviderRow | null; error: Error | null };

  if (error || !team) {
    return null;
  }

  return {
    teamId: team.id,
    ssoProvider: team.ssoProvider as SsoProvider,
  };
}

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase();
}

/**
 * Check if a user should be routed to SSO based on their email
 */
export async function shouldRouteToSso(email: string): Promise<{ shouldRoute: boolean; teamId?: string; provider?: SsoProvider }> {
  const domain = extractEmailDomain(email);
  if (!domain) {
    return { shouldRoute: false };
  }

  const team = await getTeamByEmailDomain(domain);
  if (!team) {
    return { shouldRoute: false };
  }

  return {
    shouldRoute: true,
    teamId: team.teamId,
    provider: team.ssoProvider,
  };
}

/**
 * Clear SSO configuration for a team
 */
export async function clearTeamSsoConfig(teamId: string): Promise<void> {
  const supabase = await createServerActionClient();

  // Type assertion needed: SSO columns added via migration
  const { error } = await (supabase.from('Team') as ReturnType<typeof supabase.from>)
    .update({
      ssoEnabled: false,
      ssoProvider: null,
      ssoConfig: null,
      ssoDomain: null,
      ssoEnforced: false,
    })
    .eq('id', teamId);

  if (error) {
    logger.error('Failed to clear SSO config', new Error(error.message), { teamId });
    throw new Error('Failed to clear SSO configuration');
  }
}
