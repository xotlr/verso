-- Migration: Row Level Security Policies
-- Replaces application-level authorization with database-enforced security
-- Run order: 00003 (after auth functions and auth_id setup)

-- ============================================
-- IMPORTANT: Drop existing permissive policies first
-- ============================================

-- Helper function to safely drop policies
CREATE OR REPLACE FUNCTION _temp_drop_policy(p_table TEXT, p_policy TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
EXCEPTION WHEN undefined_table THEN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop all service_role_all policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON public.%I', tbl);
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS _temp_drop_policy(TEXT, TEXT);

-- ============================================
-- USER TABLE POLICIES
-- ============================================

-- Users can read any public profile or their own
CREATE POLICY "user_select" ON public."User" FOR SELECT
USING (
  "isPublic" = true
  OR id = public.current_user_id()
  OR auth_id = auth.uid()
);

-- Users can only update their own profile
CREATE POLICY "user_update" ON public."User" FOR UPDATE
USING (id = public.current_user_id() OR auth_id = auth.uid())
WITH CHECK (id = public.current_user_id() OR auth_id = auth.uid());

-- Inserts handled by trigger on auth.users (no direct insert policy needed)
-- Delete protected - users can request account deletion through support

-- ============================================
-- TEAM TABLE POLICIES
-- ============================================

-- Teams: viewable by owner, members, or if public
CREATE POLICY "team_select" ON public."Team" FOR SELECT
USING (
  "isPublic" = true
  OR "ownerId" = public.current_user_id()
  OR public.is_team_member(id)
);

-- Teams: only owner can update
CREATE POLICY "team_update" ON public."Team" FOR UPDATE
USING ("ownerId" = public.current_user_id())
WITH CHECK ("ownerId" = public.current_user_id());

-- Teams: authenticated users can create (they become owner)
CREATE POLICY "team_insert" ON public."Team" FOR INSERT
WITH CHECK (
  public.is_authenticated()
  AND "ownerId" = public.current_user_id()
);

-- Teams: only owner can delete
CREATE POLICY "team_delete" ON public."Team" FOR DELETE
USING ("ownerId" = public.current_user_id());

-- ============================================
-- TEAM MEMBER TABLE POLICIES
-- ============================================

-- Team members: viewable by any team member
CREATE POLICY "team_member_select" ON public."TeamMember" FOR SELECT
USING (public.is_team_member("teamId"));

-- Team members: admins can add members
CREATE POLICY "team_member_insert" ON public."TeamMember" FOR INSERT
WITH CHECK (public.is_team_admin("teamId"));

-- Team members: admins can update (role changes)
CREATE POLICY "team_member_update" ON public."TeamMember" FOR UPDATE
USING (public.is_team_admin("teamId"))
WITH CHECK (public.is_team_admin("teamId"));

-- Team members: admins can remove (except owner), members can leave
CREATE POLICY "team_member_delete" ON public."TeamMember" FOR DELETE
USING (
  -- Admins can remove non-owners
  (public.is_team_admin("teamId") AND role != 'OWNER')
  -- Members can remove themselves
  OR "userId" = public.current_user_id()
);

-- ============================================
-- TEAM INVITE TABLE POLICIES
-- ============================================

-- Invites: viewable by team admins and the invitee (by email)
CREATE POLICY "team_invite_select" ON public."TeamInvite" FOR SELECT
USING (
  public.is_team_admin("teamId")
  OR email = (SELECT email FROM public."User" WHERE id = public.current_user_id())
);

-- Invites: admins can create
CREATE POLICY "team_invite_insert" ON public."TeamInvite" FOR INSERT
WITH CHECK (public.is_team_admin("teamId"));

-- Invites: admins can delete
CREATE POLICY "team_invite_delete" ON public."TeamInvite" FOR DELETE
USING (public.is_team_admin("teamId"));

-- ============================================
-- PROJECT TABLE POLICIES
-- ============================================

-- Projects: viewable if owner, team member, shared, or public+published
CREATE POLICY "project_select" ON public."Project" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR ("teamId" IS NOT NULL AND public.is_team_member("teamId"))
  OR public.can_access_project(id)
  OR ("isPublic" = true AND "publishedAt" IS NOT NULL)
);

-- Projects: owner or team admin can update
CREATE POLICY "project_update" ON public."Project" FOR UPDATE
USING (
  "userId" = public.current_user_id()
  OR ("teamId" IS NOT NULL AND public.is_team_admin("teamId"))
  OR public.can_access_project(id, NULL, 'EDITOR')
);

-- Projects: authenticated users can create
CREATE POLICY "project_insert" ON public."Project" FOR INSERT
WITH CHECK (
  public.is_authenticated()
  AND "userId" = public.current_user_id()
);

-- Projects: owner only can delete
CREATE POLICY "project_delete" ON public."Project" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- PROJECT SHARE TABLE POLICIES
-- ============================================

-- Project shares: project owner/admin can view
CREATE POLICY "project_share_select" ON public."ProjectShare" FOR SELECT
USING (
  public.can_access_project("projectId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()  -- Can see own share
);

-- Project shares: project admin can manage
CREATE POLICY "project_share_insert" ON public."ProjectShare" FOR INSERT
WITH CHECK (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_share_update" ON public."ProjectShare" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_share_delete" ON public."ProjectShare" FOR DELETE
USING (
  public.can_access_project("projectId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()  -- Can remove own access
);

-- ============================================
-- SCREENPLAY TABLE POLICIES
-- ============================================

-- Screenplays: complex access check
CREATE POLICY "screenplay_select" ON public."Screenplay" FOR SELECT
USING (
  public.can_access_screenplay(id)
  OR ("isPublic" = true AND "publishedAt" IS NOT NULL)
);

-- Screenplays: update requires at least EDITOR access
CREATE POLICY "screenplay_update" ON public."Screenplay" FOR UPDATE
USING (public.can_access_screenplay(id, NULL, 'EDITOR'));

-- Screenplays: authenticated users can create (becomes owner)
CREATE POLICY "screenplay_insert" ON public."Screenplay" FOR INSERT
WITH CHECK (
  public.is_authenticated()
  AND "userId" = public.current_user_id()
);

-- Screenplays: only owner can delete
CREATE POLICY "screenplay_delete" ON public."Screenplay" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- SCREENPLAY VERSION TABLE POLICIES
-- ============================================

-- Versions: inherit access from screenplay
CREATE POLICY "screenplay_version_select" ON public."ScreenplayVersion" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

-- Versions: creators with at least EDITOR access can create
CREATE POLICY "screenplay_version_insert" ON public."ScreenplayVersion" FOR INSERT
WITH CHECK (
  public.can_access_screenplay("screenplayId", NULL, 'EDITOR')
  AND "createdBy" = public.current_user_id()
);

-- Versions: screenplay owner can delete
CREATE POLICY "screenplay_version_delete" ON public."ScreenplayVersion" FOR DELETE
USING (public.is_screenplay_owner("screenplayId"));

-- ============================================
-- SCREENPLAY SHARE TABLE POLICIES
-- ============================================

-- Screenplay shares: screenplay owner/admin can view
CREATE POLICY "screenplay_share_select" ON public."ScreenplayShare" FOR SELECT
USING (
  public.can_access_screenplay("screenplayId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()
);

-- Screenplay shares: screenplay admin can manage
CREATE POLICY "screenplay_share_insert" ON public."ScreenplayShare" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

CREATE POLICY "screenplay_share_update" ON public."ScreenplayShare" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

CREATE POLICY "screenplay_share_delete" ON public."ScreenplayShare" FOR DELETE
USING (
  public.can_access_screenplay("screenplayId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()
);

-- ============================================
-- SHARE LINK TABLE POLICIES
-- ============================================

-- Share links: screenplay owner/admin can view
CREATE POLICY "share_link_select" ON public."ShareLink" FOR SELECT
USING (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

-- Share links: admin can manage
CREATE POLICY "share_link_insert" ON public."ShareLink" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

CREATE POLICY "share_link_update" ON public."ShareLink" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

CREATE POLICY "share_link_delete" ON public."ShareLink" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'ADMIN'));

-- ============================================
-- SERIES TABLE POLICIES
-- ============================================

-- Series: owner, project team, or shared
CREATE POLICY "series_select" ON public."Series" FOR SELECT
USING (public.can_access_series(id));

CREATE POLICY "series_update" ON public."Series" FOR UPDATE
USING (public.can_access_series(id, NULL, 'EDITOR'));

CREATE POLICY "series_insert" ON public."Series" FOR INSERT
WITH CHECK (
  public.is_authenticated()
  AND "userId" = public.current_user_id()
);

CREATE POLICY "series_delete" ON public."Series" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- SEASON TABLE POLICIES
-- ============================================

-- Seasons: inherit access from series
CREATE POLICY "season_select" ON public."Season" FOR SELECT
USING (public.can_access_series("seriesId"));

CREATE POLICY "season_insert" ON public."Season" FOR INSERT
WITH CHECK (public.can_access_series("seriesId", NULL, 'EDITOR'));

CREATE POLICY "season_update" ON public."Season" FOR UPDATE
USING (public.can_access_series("seriesId", NULL, 'EDITOR'));

CREATE POLICY "season_delete" ON public."Season" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public."Series"
    WHERE id = "seriesId" AND "userId" = public.current_user_id()
  )
);

-- ============================================
-- STACK TABLE POLICIES
-- ============================================

CREATE POLICY "stack_select" ON public."Stack" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR ("projectId" IS NOT NULL AND public.can_access_project("projectId"))
);

CREATE POLICY "stack_insert" ON public."Stack" FOR INSERT
WITH CHECK (
  public.is_authenticated()
  AND "userId" = public.current_user_id()
);

CREATE POLICY "stack_update" ON public."Stack" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "stack_delete" ON public."Stack" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- SCENE META TABLE POLICIES
-- ============================================

CREATE POLICY "scene_meta_select" ON public."SceneMeta" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

CREATE POLICY "scene_meta_insert" ON public."SceneMeta" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "scene_meta_update" ON public."SceneMeta" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "scene_meta_delete" ON public."SceneMeta" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

-- ============================================
-- CHARACTER META TABLE POLICIES
-- ============================================

CREATE POLICY "character_meta_select" ON public."CharacterMeta" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

CREATE POLICY "character_meta_insert" ON public."CharacterMeta" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "character_meta_update" ON public."CharacterMeta" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "character_meta_delete" ON public."CharacterMeta" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

-- ============================================
-- SCENE ATTACHMENT TABLE POLICIES
-- ============================================

CREATE POLICY "scene_attachment_select" ON public."SceneAttachment" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

CREATE POLICY "scene_attachment_insert" ON public."SceneAttachment" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "scene_attachment_delete" ON public."SceneAttachment" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

-- ============================================
-- SHOT TABLE POLICIES
-- ============================================

CREATE POLICY "shot_select" ON public."Shot" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

CREATE POLICY "shot_insert" ON public."Shot" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "shot_update" ON public."Shot" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "shot_delete" ON public."Shot" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

-- ============================================
-- TAKE NOTE TABLE POLICIES
-- ============================================

CREATE POLICY "take_note_select" ON public."TakeNote" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."Shot" s
    WHERE s.id = "shotId"
      AND public.can_access_screenplay(s."screenplayId")
  )
);

CREATE POLICY "take_note_insert" ON public."TakeNote" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."Shot" s
    WHERE s.id = "shotId"
      AND public.can_access_screenplay(s."screenplayId", NULL, 'EDITOR')
  )
);

CREATE POLICY "take_note_update" ON public."TakeNote" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public."Shot" s
    WHERE s.id = "shotId"
      AND public.can_access_screenplay(s."screenplayId", NULL, 'EDITOR')
  )
);

CREATE POLICY "take_note_delete" ON public."TakeNote" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public."Shot" s
    WHERE s.id = "shotId"
      AND public.can_access_screenplay(s."screenplayId", NULL, 'EDITOR')
  )
);

-- ============================================
-- CUSTOM CARD GROUP TABLE POLICIES
-- ============================================

CREATE POLICY "custom_card_group_select" ON public."CustomCardGroup" FOR SELECT
USING (public.can_access_screenplay("screenplayId"));

CREATE POLICY "custom_card_group_insert" ON public."CustomCardGroup" FOR INSERT
WITH CHECK (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "custom_card_group_update" ON public."CustomCardGroup" FOR UPDATE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

CREATE POLICY "custom_card_group_delete" ON public."CustomCardGroup" FOR DELETE
USING (public.can_access_screenplay("screenplayId", NULL, 'EDITOR'));

-- ============================================
-- NOTE TABLE POLICIES (Project notes)
-- ============================================

CREATE POLICY "note_select" ON public."Note" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR public.can_access_project("projectId")
);

CREATE POLICY "note_insert" ON public."Note" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_project("projectId", NULL, 'EDITOR')
);

CREATE POLICY "note_update" ON public."Note" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "note_delete" ON public."Note" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- SCHEDULE TABLE POLICIES
-- ============================================

CREATE POLICY "schedule_select" ON public."Schedule" FOR SELECT
USING (public.can_access_project("projectId"));

CREATE POLICY "schedule_insert" ON public."Schedule" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_project("projectId", NULL, 'EDITOR')
);

CREATE POLICY "schedule_update" ON public."Schedule" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'EDITOR'));

CREATE POLICY "schedule_delete" ON public."Schedule" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- BUDGET TABLE POLICIES
-- ============================================

CREATE POLICY "budget_select" ON public."Budget" FOR SELECT
USING (public.can_access_project("projectId"));

CREATE POLICY "budget_insert" ON public."Budget" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_project("projectId", NULL, 'EDITOR')
);

CREATE POLICY "budget_update" ON public."Budget" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'EDITOR'));

CREATE POLICY "budget_delete" ON public."Budget" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- CALLSHEET TABLE POLICIES
-- ============================================

CREATE POLICY "callsheet_select" ON public."Callsheet" FOR SELECT
USING (public.can_access_project("projectId"));

CREATE POLICY "callsheet_insert" ON public."Callsheet" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_project("projectId", NULL, 'EDITOR')
);

CREATE POLICY "callsheet_update" ON public."Callsheet" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'EDITOR'));

CREATE POLICY "callsheet_delete" ON public."Callsheet" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- EXTERNAL LINK TABLE POLICIES
-- ============================================

CREATE POLICY "external_link_select" ON public."ExternalLink" FOR SELECT
USING (public.can_access_project("projectId"));

CREATE POLICY "external_link_insert" ON public."ExternalLink" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_project("projectId", NULL, 'EDITOR')
);

CREATE POLICY "external_link_update" ON public."ExternalLink" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "external_link_delete" ON public."ExternalLink" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- PROJECT ROLE TABLE POLICIES
-- ============================================

CREATE POLICY "project_role_select" ON public."ProjectRole" FOR SELECT
USING (public.can_access_project("projectId"));

CREATE POLICY "project_role_insert" ON public."ProjectRole" FOR INSERT
WITH CHECK (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_role_update" ON public."ProjectRole" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_role_delete" ON public."ProjectRole" FOR DELETE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

-- ============================================
-- PROJECT ROLE INVITE TABLE POLICIES
-- ============================================

CREATE POLICY "project_role_invite_select" ON public."ProjectRoleInvite" FOR SELECT
USING (
  public.can_access_project("projectId", NULL, 'ADMIN')
  OR email = (SELECT email FROM public."User" WHERE id = public.current_user_id())
);

CREATE POLICY "project_role_invite_insert" ON public."ProjectRoleInvite" FOR INSERT
WITH CHECK (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_role_invite_delete" ON public."ProjectRoleInvite" FOR DELETE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

-- ============================================
-- PROJECT ROLE NEED TABLE POLICIES
-- ============================================

-- Viewable by anyone for discovery (filtered by project visibility)
CREATE POLICY "project_role_need_select" ON public."ProjectRoleNeed" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public."Project" p
    WHERE p.id = "projectId"
      AND (p."isPublic" = true OR public.can_access_project(p.id))
  )
);

CREATE POLICY "project_role_need_insert" ON public."ProjectRoleNeed" FOR INSERT
WITH CHECK (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_role_need_update" ON public."ProjectRoleNeed" FOR UPDATE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

CREATE POLICY "project_role_need_delete" ON public."ProjectRoleNeed" FOR DELETE
USING (public.can_access_project("projectId", NULL, 'ADMIN'));

-- ============================================
-- PROJECT ROLE APPLICATION TABLE POLICIES
-- ============================================

CREATE POLICY "project_role_application_select" ON public."ProjectRoleApplication" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public."ProjectRoleNeed" prn
    JOIN public."Project" p ON p.id = prn."projectId"
    WHERE prn.id = "roleNeedId"
      AND public.can_access_project(p.id, NULL, 'ADMIN')
  )
);

CREATE POLICY "project_role_application_insert" ON public."ProjectRoleApplication" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "project_role_application_update" ON public."ProjectRoleApplication" FOR UPDATE
USING (
  "userId" = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public."ProjectRoleNeed" prn
    JOIN public."Project" p ON p.id = prn."projectId"
    WHERE prn.id = "roleNeedId"
      AND public.can_access_project(p.id, NULL, 'ADMIN')
  )
);

CREATE POLICY "project_role_application_delete" ON public."ProjectRoleApplication" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- USER STATS TABLE POLICIES
-- ============================================

CREATE POLICY "user_stats_select" ON public."UserStats" FOR SELECT
USING ("userId" = public.current_user_id());

CREATE POLICY "user_stats_insert" ON public."UserStats" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "user_stats_update" ON public."UserStats" FOR UPDATE
USING ("userId" = public.current_user_id());

-- ============================================
-- WRITING SESSION TABLE POLICIES
-- ============================================

CREATE POLICY "writing_session_select" ON public."WritingSession" FOR SELECT
USING ("userId" = public.current_user_id());

CREATE POLICY "writing_session_insert" ON public."WritingSession" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

-- ============================================
-- ACTIVITY TABLE POLICIES
-- ============================================

CREATE POLICY "activity_select" ON public."Activity" FOR SELECT
USING ("userId" = public.current_user_id());

CREATE POLICY "activity_insert" ON public."Activity" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

-- ============================================
-- CONNECTION TABLE POLICIES
-- ============================================

CREATE POLICY "connection_select" ON public."Connection" FOR SELECT
USING (
  "requesterId" = public.current_user_id()
  OR "addresseeId" = public.current_user_id()
);

CREATE POLICY "connection_insert" ON public."Connection" FOR INSERT
WITH CHECK ("requesterId" = public.current_user_id());

CREATE POLICY "connection_update" ON public."Connection" FOR UPDATE
USING (
  "requesterId" = public.current_user_id()
  OR "addresseeId" = public.current_user_id()
);

CREATE POLICY "connection_delete" ON public."Connection" FOR DELETE
USING (
  "requesterId" = public.current_user_id()
  OR "addresseeId" = public.current_user_id()
);

-- ============================================
-- CREDIT TABLE POLICIES
-- ============================================

CREATE POLICY "credit_select" ON public."Credit" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR EXISTS (SELECT 1 FROM public."User" u WHERE u.id = "userId" AND u."isPublic" = true)
);

CREATE POLICY "credit_insert" ON public."Credit" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "credit_update" ON public."Credit" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "credit_delete" ON public."Credit" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- NOTIFICATION TABLE POLICIES
-- ============================================

CREATE POLICY "notification_select" ON public."Notification" FOR SELECT
USING ("userId" = public.current_user_id());

CREATE POLICY "notification_update" ON public."Notification" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "notification_delete" ON public."Notification" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- GREETING HISTORY TABLE POLICIES
-- ============================================

CREATE POLICY "greeting_history_select" ON public."GreetingHistory" FOR SELECT
USING ("userId" = public.current_user_id());

CREATE POLICY "greeting_history_insert" ON public."GreetingHistory" FOR INSERT
WITH CHECK ("userId" = public.current_user_id());

-- ============================================
-- COLLABORATION TABLES POLICIES
-- ============================================

-- Screenplay operations: inherit from screenplay
CREATE POLICY "screenplay_operation_select" ON public.screenplay_operations FOR SELECT
USING (public.can_access_screenplay(screenplay_id));

CREATE POLICY "screenplay_operation_insert" ON public.screenplay_operations FOR INSERT
WITH CHECK (
  public.can_access_screenplay(screenplay_id, NULL, 'EDITOR')
  AND user_id = public.current_user_id()
);

-- Collaboration sessions
CREATE POLICY "collaboration_session_select" ON public.collaboration_sessions FOR SELECT
USING (public.can_access_screenplay(screenplay_id));

CREATE POLICY "collaboration_session_insert" ON public.collaboration_sessions FOR INSERT
WITH CHECK (
  public.can_access_screenplay(screenplay_id)
  AND user_id = public.current_user_id()
);

CREATE POLICY "collaboration_session_update" ON public.collaboration_sessions FOR UPDATE
USING (user_id = public.current_user_id());

CREATE POLICY "collaboration_session_delete" ON public.collaboration_sessions FOR DELETE
USING (user_id = public.current_user_id());

-- Collaboration conflicts
CREATE POLICY "collaboration_conflict_select" ON public.collaboration_conflicts FOR SELECT
USING (public.can_access_screenplay(screenplay_id));

CREATE POLICY "collaboration_conflict_update" ON public.collaboration_conflicts FOR UPDATE
USING (public.can_access_screenplay(screenplay_id, NULL, 'EDITOR'));

-- ============================================
-- DIGITAL SIDE TABLE POLICIES
-- ============================================

CREATE POLICY "digital_side_select" ON public."DigitalSide" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR public.can_access_screenplay("screenplayId")
);

CREATE POLICY "digital_side_insert" ON public."DigitalSide" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_screenplay("screenplayId", NULL, 'EDITOR')
);

CREATE POLICY "digital_side_update" ON public."DigitalSide" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "digital_side_delete" ON public."DigitalSide" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- CALLSHEET SHARE LINK TABLE POLICIES
-- ============================================

CREATE POLICY "callsheet_share_link_select" ON public."CallsheetShareLink" FOR SELECT
USING (
  "userId" = public.current_user_id()
  OR public.can_access_callsheet("callsheetId")
);

CREATE POLICY "callsheet_share_link_insert" ON public."CallsheetShareLink" FOR INSERT
WITH CHECK (
  "userId" = public.current_user_id()
  AND public.can_access_callsheet("callsheetId", NULL, 'EDITOR')
);

CREATE POLICY "callsheet_share_link_update" ON public."CallsheetShareLink" FOR UPDATE
USING ("userId" = public.current_user_id());

CREATE POLICY "callsheet_share_link_delete" ON public."CallsheetShareLink" FOR DELETE
USING ("userId" = public.current_user_id());

-- ============================================
-- CREW CHECK-IN TABLE POLICIES
-- ============================================

CREATE POLICY "crew_check_in_select" ON public."CrewCheckIn" FOR SELECT
USING (public.can_access_callsheet("callsheetId"));

CREATE POLICY "crew_check_in_insert" ON public."CrewCheckIn" FOR INSERT
WITH CHECK (public.can_access_callsheet("callsheetId", NULL, 'EDITOR'));

CREATE POLICY "crew_check_in_update" ON public."CrewCheckIn" FOR UPDATE
USING (public.can_access_callsheet("callsheetId", NULL, 'EDITOR'));

CREATE POLICY "crew_check_in_delete" ON public."CrewCheckIn" FOR DELETE
USING (public.can_access_callsheet("callsheetId", NULL, 'EDITOR'));

-- ============================================
-- TEAM AUDIT LOG TABLE POLICIES
-- ============================================

-- Only team admins can view audit logs
CREATE POLICY "team_audit_log_select" ON public."TeamAuditLog" FOR SELECT
USING (public.is_team_admin("teamId"));

-- Only system can insert (via triggers/functions)
-- No insert policy for users

-- ============================================
-- SHARE INVITE TABLE POLICIES
-- ============================================

CREATE POLICY "share_invite_select" ON public."ShareInvite" FOR SELECT
USING (
  "invitedBy" = public.current_user_id()
  OR email = (SELECT email FROM public."User" WHERE id = public.current_user_id())
);

CREATE POLICY "share_invite_insert" ON public."ShareInvite" FOR INSERT
WITH CHECK (
  "invitedBy" = public.current_user_id()
  AND (
    ("screenplayId" IS NOT NULL AND public.can_access_screenplay("screenplayId", NULL, 'ADMIN'))
    OR ("projectId" IS NOT NULL AND public.can_access_project("projectId", NULL, 'ADMIN'))
    OR ("seriesId" IS NOT NULL AND public.can_access_series("seriesId", NULL, 'ADMIN'))
  )
);

CREATE POLICY "share_invite_delete" ON public."ShareInvite" FOR DELETE
USING (
  "invitedBy" = public.current_user_id()
  OR email = (SELECT email FROM public."User" WHERE id = public.current_user_id())
);

-- ============================================
-- SERIES SHARE TABLE POLICIES
-- ============================================

CREATE POLICY "series_share_select" ON public."SeriesShare" FOR SELECT
USING (
  public.can_access_series("seriesId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()
);

CREATE POLICY "series_share_insert" ON public."SeriesShare" FOR INSERT
WITH CHECK (public.can_access_series("seriesId", NULL, 'ADMIN'));

CREATE POLICY "series_share_update" ON public."SeriesShare" FOR UPDATE
USING (public.can_access_series("seriesId", NULL, 'ADMIN'));

CREATE POLICY "series_share_delete" ON public."SeriesShare" FOR DELETE
USING (
  public.can_access_series("seriesId", NULL, 'ADMIN')
  OR "userId" = public.current_user_id()
);

-- ============================================
-- ACCESS REQUEST TABLE POLICIES
-- ============================================

CREATE POLICY "access_request_select" ON public."AccessRequest" FOR SELECT
USING (
  email = (SELECT email FROM public."User" WHERE id = public.current_user_id())
  OR EXISTS (
    SELECT 1 FROM public."ShareLink" sl
    WHERE sl.id = "shareLinkId"
      AND public.can_access_screenplay(sl."screenplayId", NULL, 'ADMIN')
  )
);

CREATE POLICY "access_request_insert" ON public."AccessRequest" FOR INSERT
WITH CHECK (true);  -- Anyone can request access via public share link

CREATE POLICY "access_request_update" ON public."AccessRequest" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public."ShareLink" sl
    WHERE sl.id = "shareLinkId"
      AND public.can_access_screenplay(sl."screenplayId", NULL, 'ADMIN')
  )
);

-- ============================================
-- STATUS PAGE TABLES (Public read, admin write)
-- ============================================

-- Service health checks: public read
CREATE POLICY "service_health_check_select" ON public."ServiceHealthCheck" FOR SELECT
USING (true);

-- Uptime records: public read
CREATE POLICY "uptime_record_select" ON public."UptimeRecord" FOR SELECT
USING (true);

-- Incidents: public read
CREATE POLICY "incident_select" ON public."Incident" FOR SELECT
USING (true);

-- Incident updates: public read
CREATE POLICY "incident_update_select" ON public."IncidentUpdate" FOR SELECT
USING (true);

-- Write policies for status tables handled by service role only

-- ============================================
-- WEBHOOK EVENTS (Service role only)
-- ============================================

-- No user-facing policies - handled by service role
-- processed_webhook_events has no user-facing policies

-- ============================================
-- NEXTAUTH TABLES (Account, Session, etc.)
-- ============================================

-- These tables are managed by NextAuth adapter (service role)
-- After migration to Supabase Auth, these will be deprecated

-- Account: users can view their own
CREATE POLICY "account_select" ON public."Account" FOR SELECT
USING ("userId" = public.current_user_id());

-- Session: users can view their own
CREATE POLICY "session_select" ON public."Session" FOR SELECT
USING ("userId" = public.current_user_id());

-- VerificationToken and PasswordResetToken managed by service role only
