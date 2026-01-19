-- =====================================================
-- Migration: B2B Security Features
--
-- Adds:
-- 1. UserSession table for session management
-- 2. SSO configuration columns on Team
-- 3. MFA columns on User
-- =====================================================

-- =====================================================
-- 1. USER SESSION TRACKING
-- =====================================================

-- Create the user sessions table
CREATE TABLE IF NOT EXISTS public."UserSession" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "sessionToken" TEXT NOT NULL, -- Hashed session identifier (first 8 chars of Supabase session)
  "deviceInfo" TEXT, -- Parsed user-agent (browser, OS)
  "ipAddress" TEXT,
  "country" TEXT,
  "city" TEXT,
  "lastActive" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3) WITH TIME ZONE, -- Null if active, timestamp if revoked

  -- Unique constraint on user + session token to prevent duplicates
  CONSTRAINT "UserSession_userId_sessionToken_key" UNIQUE ("userId", "sessionToken")
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON public."UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_lastActive_idx" ON public."UserSession"("lastActive" DESC);
CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON public."UserSession"("userId", "revokedAt");

-- Enable RLS
ALTER TABLE public."UserSession" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own sessions
-- Note: userId is the application user ID (TEXT), auth_id is UUID
-- We look up the user by auth_id (UUID) and compare their application ID
CREATE POLICY "session_select_own"
  ON public."UserSession"
  FOR SELECT
  TO authenticated
  USING ("userId" = (SELECT id FROM public."User" WHERE auth_id = auth.uid()));

-- Users can update (revoke) their own sessions
CREATE POLICY "session_update_own"
  ON public."UserSession"
  FOR UPDATE
  TO authenticated
  USING ("userId" = (SELECT id FROM public."User" WHERE auth_id = auth.uid()))
  WITH CHECK ("userId" = (SELECT id FROM public."User" WHERE auth_id = auth.uid()));

-- Server-only insert via service role

-- Grant permissions
GRANT SELECT, UPDATE ON public."UserSession" TO authenticated;

-- Add comments
COMMENT ON TABLE public."UserSession" IS 'Tracks active user sessions for device management';
COMMENT ON COLUMN public."UserSession"."sessionToken" IS 'Hashed/truncated session identifier for matching';
COMMENT ON COLUMN public."UserSession"."revokedAt" IS 'Timestamp when session was revoked, null if still active';

-- =====================================================
-- 2. SSO CONFIGURATION ON TEAM
-- =====================================================

-- Add SSO columns to Team table
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "ssoEnabled" BOOLEAN DEFAULT false;
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "ssoProvider" TEXT; -- 'saml' | 'oidc'
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "ssoConfig" JSONB; -- Provider-specific config
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "ssoDomain" TEXT; -- Email domain for SSO routing (e.g., 'acme.com')
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "ssoEnforced" BOOLEAN DEFAULT false; -- Require SSO for all members

-- Index for SSO domain lookup (for routing users to correct IdP)
CREATE INDEX IF NOT EXISTS "Team_ssoDomain_idx" ON public."Team"("ssoDomain") WHERE "ssoEnabled" = true;

-- Add comments
COMMENT ON COLUMN public."Team"."ssoEnabled" IS 'Whether SSO is enabled for this team';
COMMENT ON COLUMN public."Team"."ssoProvider" IS 'SSO provider type: saml or oidc';
COMMENT ON COLUMN public."Team"."ssoConfig" IS 'Provider-specific SSO configuration (encrypted at rest)';
COMMENT ON COLUMN public."Team"."ssoDomain" IS 'Email domain for automatic SSO routing';
COMMENT ON COLUMN public."Team"."ssoEnforced" IS 'Whether to enforce SSO-only authentication for team members';

-- =====================================================
-- 3. MFA CONFIGURATION ON USER
-- =====================================================

-- Add MFA columns to User table
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3) WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN public."User"."mfaEnabled" IS 'Whether user has MFA enabled (actual secrets stored by Supabase Auth)';
COMMENT ON COLUMN public."User"."mfaVerifiedAt" IS 'When MFA was last verified/enrolled';

-- =====================================================
-- 4. TEAM MFA POLICY
-- =====================================================

-- Allow teams to require MFA for all members
ALTER TABLE public."Team" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN DEFAULT false;

COMMENT ON COLUMN public."Team"."mfaRequired" IS 'Whether to require MFA for all team members';

-- =====================================================
-- 5. HELPER FUNCTION: Get current session token prefix
-- =====================================================

-- Function to extract session identifier (used for matching sessions)
CREATE OR REPLACE FUNCTION get_session_prefix(session_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return first 16 chars as session identifier
  RETURN LEFT(session_id, 16);
END;
$$;
