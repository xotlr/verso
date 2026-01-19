-- Migration: Supabase Auth Helper Functions for RLS
-- These functions are used by RLS policies to check permissions
-- Run order: 00002 (after auth_id column, before policies)

-- ============================================
-- STEP 1: Core Auth Functions
-- ============================================

-- Get the current user's app user ID (from users table, not auth.users)
-- This maps Supabase auth.uid() to our application user ID
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public."User"
  WHERE auth_id = auth.uid()
$$;

-- Convenience: Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- ============================================
-- STEP 2: Share Role Hierarchy Functions
-- ============================================

-- Share role hierarchy: VIEWER < COMMENTER < EDITOR < ADMIN
CREATE OR REPLACE FUNCTION public.share_role_level(role TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE role
    WHEN 'VIEWER' THEN 1
    WHEN 'COMMENTER' THEN 2
    WHEN 'EDITOR' THEN 3
    WHEN 'ADMIN' THEN 4
    ELSE 0
  END
$$;

-- Check if user has at least the minimum share role
CREATE OR REPLACE FUNCTION public.has_min_share_role(user_role TEXT, min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.share_role_level(user_role) >= public.share_role_level(min_role)
$$;

-- ============================================
-- STEP 3: Team Role Hierarchy Functions
-- ============================================

-- Team role hierarchy: MEMBER < ADMIN < OWNER
CREATE OR REPLACE FUNCTION public.team_role_level(role TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE role
    WHEN 'MEMBER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'OWNER' THEN 3
    ELSE 0
  END
$$;

-- Check if user has at least the minimum team role
CREATE OR REPLACE FUNCTION public.has_min_team_role(user_role TEXT, min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.team_role_level(user_role) >= public.team_role_level(min_role)
$$;

-- ============================================
-- STEP 4: Team Membership Functions
-- ============================================

-- Check if user is a member of a team (any role)
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."TeamMember"
    WHERE "teamId" = p_team_id
      AND "userId" = COALESCE(p_user_id, public.get_user_id())
  )
$$;

-- Check if user is an admin of a team (ADMIN or OWNER)
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."TeamMember"
    WHERE "teamId" = p_team_id
      AND "userId" = COALESCE(p_user_id, public.get_user_id())
      AND role IN ('ADMIN', 'OWNER')
  )
$$;

-- Check if user is the owner of a team
CREATE OR REPLACE FUNCTION public.is_team_owner(p_team_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Team"
    WHERE id = p_team_id
      AND "ownerId" = COALESCE(p_user_id, public.get_user_id())
  )
$$;

-- Get user's role in a team (returns NULL if not a member)
CREATE OR REPLACE FUNCTION public.get_team_role(p_team_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public."TeamMember"
  WHERE "teamId" = p_team_id
    AND "userId" = COALESCE(p_user_id, public.get_user_id())
$$;

-- ============================================
-- STEP 5: Screenplay Access Functions
-- ============================================

-- Check if user can access a screenplay with at least the specified role
-- Returns TRUE if user has access via:
-- 1. Direct ownership (userId)
-- 2. Team membership (teamId or project's teamId)
-- 3. Direct share (ScreenplayShare)
-- 4. Project share (if screenplay belongs to a project)
CREATE OR REPLACE FUNCTION public.can_access_screenplay(
  p_screenplay_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_min_role TEXT DEFAULT 'VIEWER'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_screenplay RECORD;
  v_team_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, public.get_user_id());

  -- Fetch screenplay with project info
  SELECT s.*, p."teamId" as project_team_id
  INTO v_screenplay
  FROM public."Screenplay" s
  LEFT JOIN public."Project" p ON s."projectId" = p.id
  WHERE s.id = p_screenplay_id;

  IF v_screenplay IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Direct ownership - full access
  IF v_screenplay."userId" = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Team membership (screenplay's team or project's team) - full access
  v_team_id := COALESCE(v_screenplay."teamId", v_screenplay.project_team_id);
  IF v_team_id IS NOT NULL AND public.is_team_member(v_team_id, v_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 3. Direct screenplay share
  IF EXISTS (
    SELECT 1 FROM public."ScreenplayShare"
    WHERE "screenplayId" = p_screenplay_id
      AND "userId" = v_user_id
      AND public.has_min_share_role(role::TEXT, p_min_role)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Project share (if screenplay belongs to a project)
  IF v_screenplay."projectId" IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public."ProjectShare"
      WHERE "projectId" = v_screenplay."projectId"
        AND "userId" = v_user_id
        AND public.has_min_share_role(role::TEXT, p_min_role)
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Check if user is the owner of a screenplay
CREATE OR REPLACE FUNCTION public.is_screenplay_owner(p_screenplay_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Screenplay"
    WHERE id = p_screenplay_id
      AND "userId" = COALESCE(p_user_id, public.get_user_id())
  )
$$;

-- ============================================
-- STEP 6: Project Access Functions
-- ============================================

-- Check if user can access a project with at least the specified role
CREATE OR REPLACE FUNCTION public.can_access_project(
  p_project_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_min_role TEXT DEFAULT 'VIEWER'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_project RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, public.get_user_id());

  SELECT * INTO v_project
  FROM public."Project"
  WHERE id = p_project_id;

  IF v_project IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Direct ownership
  IF v_project."userId" = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Team membership
  IF v_project."teamId" IS NOT NULL AND public.is_team_member(v_project."teamId", v_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 3. Direct project share
  IF EXISTS (
    SELECT 1 FROM public."ProjectShare"
    WHERE "projectId" = p_project_id
      AND "userId" = v_user_id
      AND public.has_min_share_role(role::TEXT, p_min_role)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Check if user is the owner of a project
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Project"
    WHERE id = p_project_id
      AND "userId" = COALESCE(p_user_id, public.get_user_id())
  )
$$;

-- ============================================
-- STEP 7: Series Access Functions
-- ============================================

-- Check if user can access a series with at least the specified role
CREATE OR REPLACE FUNCTION public.can_access_series(
  p_series_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_min_role TEXT DEFAULT 'VIEWER'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_series RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, public.get_user_id());

  SELECT s.*, p."teamId" as project_team_id
  INTO v_series
  FROM public."Series" s
  LEFT JOIN public."Project" p ON s."projectId" = p.id
  WHERE s.id = p_series_id;

  IF v_series IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Direct ownership
  IF v_series."userId" = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Project team membership
  IF v_series.project_team_id IS NOT NULL AND public.is_team_member(v_series.project_team_id, v_user_id) THEN
    RETURN TRUE;
  END IF;

  -- 3. Direct series share
  IF EXISTS (
    SELECT 1 FROM public."SeriesShare"
    WHERE "seriesId" = p_series_id
      AND "userId" = v_user_id
      AND public.has_min_share_role(role::TEXT, p_min_role)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Project share (if series belongs to a project)
  IF v_series."projectId" IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public."ProjectShare"
      WHERE "projectId" = v_series."projectId"
        AND "userId" = v_user_id
        AND public.has_min_share_role(role::TEXT, p_min_role)
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================
-- STEP 8: Callsheet Access Functions
-- ============================================

-- Check if user can access a callsheet (via project access)
CREATE OR REPLACE FUNCTION public.can_access_callsheet(
  p_callsheet_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_min_role TEXT DEFAULT 'VIEWER'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Callsheet" c
    WHERE c.id = p_callsheet_id
      AND (
        c."userId" = COALESCE(p_user_id, public.get_user_id())
        OR public.can_access_project(c."projectId", COALESCE(p_user_id, public.get_user_id()), p_min_role)
      )
  )
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_role_level(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_share_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_role_level(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_team_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_admin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_screenplay(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_screenplay_owner(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_series(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_callsheet(TEXT, TEXT, TEXT) TO authenticated;
