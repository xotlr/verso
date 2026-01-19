/**
 * MFA (Multi-Factor Authentication) Utilities
 *
 * Wraps Supabase Auth MFA APIs for TOTP-based two-factor authentication.
 * Supabase handles the actual TOTP secret generation and verification.
 */

import { createServerActionClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface MfaFactor {
  id: string;
  type: 'totp';
  friendlyName: string | null;
  status: 'verified' | 'unverified';
  createdAt: string;
}

export interface EnrollResult {
  id: string;
  type: 'totp';
  totpUri: string;
  qrCode: string;
  secret: string;
}

export interface MfaStatus {
  enabled: boolean;
  factors: MfaFactor[];
}

/**
 * Get MFA status for the current user
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    logger.error('Failed to list MFA factors', new Error(error.message));
    throw new Error('Failed to get MFA status');
  }

  const verifiedFactors = data.totp.filter((f) => f.status === 'verified');

  return {
    enabled: verifiedFactors.length > 0,
    factors: data.totp.map((factor) => ({
      id: factor.id,
      type: 'totp' as const,
      friendlyName: factor.friendly_name || null,
      status: factor.status as 'verified' | 'unverified',
      createdAt: factor.created_at,
    })),
  };
}

/**
 * Start MFA enrollment (generate TOTP secret and QR code)
 */
export async function enrollMfa(friendlyName?: string): Promise<EnrollResult> {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName || 'Authenticator App',
  });

  if (error) {
    logger.error('Failed to enroll MFA', new Error(error.message));
    throw new Error('Failed to start MFA enrollment');
  }

  return {
    id: data.id,
    type: 'totp',
    totpUri: data.totp.uri,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Verify MFA enrollment with a TOTP code
 * This confirms the enrollment and enables MFA for the user
 */
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<boolean> {
  const supabase = await createServerActionClient();

  // First create a challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError) {
    logger.error('Failed to create MFA challenge', new Error(challengeError.message));
    throw new Error('Failed to verify MFA');
  }

  // Then verify the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    if (verifyError.message.includes('Invalid')) {
      throw new Error('Invalid code. Please try again.');
    }
    logger.error('Failed to verify MFA code', new Error(verifyError.message));
    throw new Error('Failed to verify MFA');
  }

  // Update user's mfaEnabled flag in our database
  // Type assertion needed: MFA columns added via migration
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await (supabase.from('User') as ReturnType<typeof supabase.from>)
      .update({
        mfaEnabled: true,
        mfaVerifiedAt: new Date().toISOString(),
      })
      .eq('auth_id', user.id);
  }

  return true;
}

/**
 * Unenroll (remove) an MFA factor
 */
export async function unenrollMfa(factorId: string): Promise<boolean> {
  const supabase = await createServerActionClient();

  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  });

  if (error) {
    logger.error('Failed to unenroll MFA', new Error(error.message));
    throw new Error('Failed to remove MFA');
  }

  // Check if there are any remaining verified factors
  const status = await getMfaStatus();

  // Update user's mfaEnabled flag in our database
  // Type assertion needed: MFA columns added via migration
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const updateData: Record<string, unknown> = { mfaEnabled: status.enabled };
    if (!status.enabled) {
      updateData.mfaVerifiedAt = null;
    }
    await (supabase.from('User') as ReturnType<typeof supabase.from>)
      .update(updateData)
      .eq('auth_id', user.id);
  }

  return true;
}

/**
 * Create an MFA challenge for verification during login
 * Returns the challenge ID to be used with verifyMfaChallenge
 */
export async function createMfaChallenge(factorId: string): Promise<string> {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (error) {
    logger.error('Failed to create MFA challenge', new Error(error.message));
    throw new Error('Failed to start MFA verification');
  }

  return data.id;
}

/**
 * Verify an MFA challenge with a TOTP code
 */
export async function verifyMfaChallenge(
  factorId: string,
  challengeId: string,
  code: string
): Promise<boolean> {
  const supabase = await createServerActionClient();

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) {
    if (error.message.includes('Invalid')) {
      throw new Error('Invalid code. Please try again.');
    }
    logger.error('Failed to verify MFA challenge', new Error(error.message));
    throw new Error('Failed to verify MFA');
  }

  return true;
}

/**
 * Check if the current session requires MFA verification
 * Returns the factor that needs to be verified, or null if no MFA required
 */
export async function getRequiredMfaFactor(): Promise<MfaFactor | null> {
  const supabase = await createServerActionClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  // Check the Assurance Level
  const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) {
    logger.error('Failed to get AAL', new Error(error.message));
    return null;
  }

  // If current level is AAL1 but next level should be AAL2, MFA is required
  if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
    const status = await getMfaStatus();
    const verifiedFactor = status.factors.find((f) => f.status === 'verified');
    return verifiedFactor || null;
  }

  return null;
}
