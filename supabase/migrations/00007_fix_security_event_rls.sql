-- =====================================================
-- Migration: Fix SecurityEvent RLS Policy
--
-- Fixes the RLS policy from 00005 that used wrong column name
-- (authId instead of auth_id) causing policy to never match.
-- Only runs if the table exists (00005 was already applied).
-- =====================================================

DO $$
BEGIN
  -- Only fix if SecurityEvent table exists (meaning 00005 was run with the bug)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SecurityEvent'
  ) THEN
    -- Drop the broken policy if it exists
    DROP POLICY IF EXISTS "security_event_select_own" ON public."SecurityEvent";

    -- Recreate with correct column name and type handling
    -- auth_id is UUID type, so we compare directly with auth.uid() (also UUID)
    CREATE POLICY "security_event_select_own"
      ON public."SecurityEvent"
      FOR SELECT
      TO authenticated
      USING ("userId" = (SELECT id FROM public."User" WHERE auth_id = auth.uid()));

    RAISE NOTICE 'Fixed SecurityEvent RLS policy';
  ELSE
    RAISE NOTICE 'SecurityEvent table does not exist yet - skipping fix';
  END IF;
END $$;
