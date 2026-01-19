-- Migration: RLS Policies for Collaboration Tables
-- Addresses security gap: CollaborationSession, CollaborationConflict, ScreenplayOperation
-- were missing RLS policies, allowing any authenticated user to query them directly
-- Run order: 00004 (after RLS policies setup)

-- ============================================
-- ENABLE RLS ON COLLABORATION TABLES
-- ============================================

ALTER TABLE public."screenplay_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."collaboration_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."collaboration_conflicts" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SCREENPLAY OPERATIONS POLICIES
-- Real-time editing operations - users can only see operations for screenplays they can access
-- ============================================

-- Select: Users can view operations for screenplays they have access to
CREATE POLICY "screenplay_operation_select" ON public."screenplay_operations" FOR SELECT
TO authenticated
USING (
  public.can_access_screenplay(screenplay_id)
);

-- Insert: Users with EDITOR+ access can create operations
CREATE POLICY "screenplay_operation_insert" ON public."screenplay_operations" FOR INSERT
TO authenticated
WITH CHECK (
  user_id = public.current_user_id()
  AND public.can_access_screenplay(screenplay_id, 'EDITOR')
);

-- Update: Not allowed - operations are immutable for audit trail
-- (No UPDATE policy = no updates allowed)

-- Delete: Only admin/owner can delete operations (cleanup)
CREATE POLICY "screenplay_operation_delete" ON public."screenplay_operations" FOR DELETE
TO authenticated
USING (
  public.can_access_screenplay(screenplay_id, 'ADMIN')
);

-- ============================================
-- COLLABORATION SESSIONS POLICIES
-- Active editor sessions with cursor positions
-- ============================================

-- Select: Users can view sessions for screenplays they can access
CREATE POLICY "collaboration_session_select" ON public."collaboration_sessions" FOR SELECT
TO authenticated
USING (
  public.can_access_screenplay(screenplay_id)
);

-- Insert: Users with access can create their own session
CREATE POLICY "collaboration_session_insert" ON public."collaboration_sessions" FOR INSERT
TO authenticated
WITH CHECK (
  user_id = public.current_user_id()
  AND public.can_access_screenplay(screenplay_id)
);

-- Update: Users can only update their own session
CREATE POLICY "collaboration_session_update" ON public."collaboration_sessions" FOR UPDATE
TO authenticated
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

-- Delete: Users can delete their own session, admins can delete any
CREATE POLICY "collaboration_session_delete" ON public."collaboration_sessions" FOR DELETE
TO authenticated
USING (
  user_id = public.current_user_id()
  OR public.can_access_screenplay(screenplay_id, 'ADMIN')
);

-- ============================================
-- COLLABORATION CONFLICTS POLICIES
-- Conflict tracking for concurrent edits
-- ============================================

-- Select: Users can view conflicts for screenplays they can access
CREATE POLICY "collaboration_conflict_select" ON public."collaboration_conflicts" FOR SELECT
TO authenticated
USING (
  public.can_access_screenplay(screenplay_id)
);

-- Insert: Users with EDITOR+ access can record conflicts
CREATE POLICY "collaboration_conflict_insert" ON public."collaboration_conflicts" FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_screenplay(screenplay_id, 'EDITOR')
);

-- Update: Users with EDITOR+ access can resolve conflicts
CREATE POLICY "collaboration_conflict_update" ON public."collaboration_conflicts" FOR UPDATE
TO authenticated
USING (public.can_access_screenplay(screenplay_id, 'EDITOR'))
WITH CHECK (
  public.can_access_screenplay(screenplay_id, 'EDITOR')
  AND (resolved_by IS NULL OR resolved_by = public.current_user_id())
);

-- Delete: Only admin/owner can delete conflicts
CREATE POLICY "collaboration_conflict_delete" ON public."collaboration_conflicts" FOR DELETE
TO authenticated
USING (
  public.can_access_screenplay(screenplay_id, 'ADMIN')
);

-- ============================================
-- SERVICE-ONLY TABLES (DOCUMENTATION)
-- These tables intentionally have NO user-facing policies
-- Access is service-role only (bypasses RLS)
-- ============================================

-- PasswordResetToken: Service-only
-- Contains sensitive password reset tokens
-- Accessed via service role in forgot-password/reset-password flows
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
-- No policies = no user access (service role bypasses RLS)

-- VerificationToken: Service-only (NextAuth legacy)
-- Contains email verification tokens
-- Accessed via service role in verification flows
ALTER TABLE public."VerificationToken" ENABLE ROW LEVEL SECURITY;
-- No policies = no user access (service role bypasses RLS)

-- ProcessedWebhookEvent: Service-only
-- Contains webhook idempotency tracking
-- Accessed via service role in webhook handler
ALTER TABLE public."processed_webhook_events" ENABLE ROW LEVEL SECURITY;
-- No policies = no user access (service role bypasses RLS)

-- ============================================
-- INDEXES FOR POLICY PERFORMANCE
-- ============================================

-- Index for screenplay_id lookups (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_screenplay_operations_screenplay_id"
ON public."screenplay_operations" (screenplay_id);

CREATE INDEX IF NOT EXISTS "idx_collaboration_sessions_screenplay_id"
ON public."collaboration_sessions" (screenplay_id);

CREATE INDEX IF NOT EXISTS "idx_collaboration_conflicts_screenplay_id"
ON public."collaboration_conflicts" (screenplay_id);
