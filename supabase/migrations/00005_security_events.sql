-- =====================================================
-- Migration: Security Events Table
--
-- Tracks security-relevant user events for audit and
-- anomaly detection (login history, password changes, etc.)
-- =====================================================

-- Create enum for event types
DO $$ BEGIN
  CREATE TYPE security_event_type AS ENUM (
    'login_success',
    'login_failed',
    'logout',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    'oauth_login',
    'oauth_linked',
    'email_changed',
    'account_deleted',
    'suspicious_activity'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the security events table
CREATE TABLE IF NOT EXISTS public."SecurityEvent" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "eventType" security_event_type NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Optional: country/city from IP geolocation (if implemented)
  "country" TEXT,
  "city" TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_idx" ON public."SecurityEvent"("userId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON public."SecurityEvent"("eventType");
CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON public."SecurityEvent"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_createdAt_idx" ON public."SecurityEvent"("userId", "createdAt" DESC);

-- Enable RLS
ALTER TABLE public."SecurityEvent" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own security events
-- Note: userId is the application user ID (TEXT), auth_id is UUID
CREATE POLICY "security_event_select_own"
  ON public."SecurityEvent"
  FOR SELECT
  TO authenticated
  USING ("userId" = (SELECT id FROM public."User" WHERE auth_id = auth.uid()));

-- Only server can insert (no direct client inserts)
-- We use a service role for inserts, so no INSERT policy for authenticated users

-- Grant permissions
GRANT SELECT ON public."SecurityEvent" TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public."SecurityEvent" IS 'Tracks security-relevant user events for audit trail and anomaly detection';
COMMENT ON COLUMN public."SecurityEvent"."eventType" IS 'Type of security event (login, logout, password change, etc.)';
COMMENT ON COLUMN public."SecurityEvent"."metadata" IS 'Additional context like OAuth provider, failure reason, etc.';

-- Cleanup policy: Security events older than 90 days can be deleted
-- This is handled by a CRON job, not automatic deletion
