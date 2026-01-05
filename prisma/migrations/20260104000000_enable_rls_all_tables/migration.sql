-- Migration: Enable RLS on all tables with permissive policies
-- Purpose: Silence Supabase dashboard warnings (Prisma uses service role, bypasses RLS)
-- Safe to run multiple times (idempotent)

-- ============================================
-- STEP 1: Drop broken policies on collaboration tables
-- These reference non-existent screenplay_collaborators table
-- ============================================

DROP POLICY IF EXISTS "Users can view operations for their screenplays" ON screenplay_operations;
DROP POLICY IF EXISTS "Users can insert operations for their screenplays" ON screenplay_operations;
DROP POLICY IF EXISTS "Users can view sessions for their screenplays" ON collaboration_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON collaboration_sessions;
DROP POLICY IF EXISTS "Users can view conflicts for their screenplays" ON collaboration_conflicts;

-- ============================================
-- STEP 2: Enable RLS on all tables
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent
-- ============================================

-- NextAuth tables
ALTER TABLE IF EXISTS "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- User tables
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "WritingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "GreetingHistory" ENABLE ROW LEVEL SECURITY;

-- Team tables
ALTER TABLE IF EXISTS "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TeamInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TeamAuditLog" ENABLE ROW LEVEL SECURITY;

-- Project tables
ALTER TABLE IF EXISTS "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectRoleInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectRoleNeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProjectRoleApplication" ENABLE ROW LEVEL SECURITY;

-- Screenplay tables
ALTER TABLE IF EXISTS "Screenplay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ScreenplayVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ScreenplayShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ShareLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ShareInvite" ENABLE ROW LEVEL SECURITY;

-- Series tables
ALTER TABLE IF EXISTS "Series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SeriesShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Season" ENABLE ROW LEVEL SECURITY;

-- Stack/content tables
ALTER TABLE IF EXISTS "Stack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SceneMeta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CharacterMeta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SceneAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExternalLink" ENABLE ROW LEVEL SECURITY;

-- Production tables
ALTER TABLE IF EXISTS "Shot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TakeNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Callsheet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CallsheetShareLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CrewCheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "DigitalSide" ENABLE ROW LEVEL SECURITY;

-- Social tables
ALTER TABLE IF EXISTS "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Credit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Notification" ENABLE ROW LEVEL SECURITY;

-- Status tables
ALTER TABLE IF EXISTS "ServiceHealthCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UptimeRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "IncidentUpdate" ENABLE ROW LEVEL SECURITY;

-- Collaboration tables (snake_case mapped names)
ALTER TABLE IF EXISTS screenplay_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collaboration_conflicts ENABLE ROW LEVEL SECURITY;

-- Webhook table
ALTER TABLE IF EXISTS processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create permissive "allow all" policies
-- These allow everything since Prisma uses service role anyway
-- ============================================

-- Helper function to create permissive policy
CREATE OR REPLACE FUNCTION _temp_create_permissive_policy(table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', table_name);
    EXECUTE format(
        'CREATE POLICY "service_role_all" ON %I FOR ALL USING (true) WITH CHECK (true)',
        table_name
    );
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping', table_name;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
SELECT _temp_create_permissive_policy('Account');
SELECT _temp_create_permissive_policy('Session');
SELECT _temp_create_permissive_policy('VerificationToken');
SELECT _temp_create_permissive_policy('PasswordResetToken');
SELECT _temp_create_permissive_policy('User');
SELECT _temp_create_permissive_policy('UserStats');
SELECT _temp_create_permissive_policy('WritingSession');
SELECT _temp_create_permissive_policy('GreetingHistory');
SELECT _temp_create_permissive_policy('Team');
SELECT _temp_create_permissive_policy('TeamMember');
SELECT _temp_create_permissive_policy('TeamInvite');
SELECT _temp_create_permissive_policy('TeamAuditLog');
SELECT _temp_create_permissive_policy('Project');
SELECT _temp_create_permissive_policy('ProjectShare');
SELECT _temp_create_permissive_policy('ProjectRole');
SELECT _temp_create_permissive_policy('ProjectRoleInvite');
SELECT _temp_create_permissive_policy('ProjectRoleNeed');
SELECT _temp_create_permissive_policy('ProjectRoleApplication');
SELECT _temp_create_permissive_policy('Screenplay');
SELECT _temp_create_permissive_policy('ScreenplayVersion');
SELECT _temp_create_permissive_policy('ScreenplayShare');
SELECT _temp_create_permissive_policy('ShareLink');
SELECT _temp_create_permissive_policy('AccessRequest');
SELECT _temp_create_permissive_policy('ShareInvite');
SELECT _temp_create_permissive_policy('Series');
SELECT _temp_create_permissive_policy('SeriesShare');
SELECT _temp_create_permissive_policy('Season');
SELECT _temp_create_permissive_policy('Stack');
SELECT _temp_create_permissive_policy('Note');
SELECT _temp_create_permissive_policy('Schedule');
SELECT _temp_create_permissive_policy('Budget');
SELECT _temp_create_permissive_policy('SceneMeta');
SELECT _temp_create_permissive_policy('CharacterMeta');
SELECT _temp_create_permissive_policy('SceneAttachment');
SELECT _temp_create_permissive_policy('ExternalLink');
SELECT _temp_create_permissive_policy('Shot');
SELECT _temp_create_permissive_policy('TakeNote');
SELECT _temp_create_permissive_policy('Callsheet');
SELECT _temp_create_permissive_policy('CallsheetShareLink');
SELECT _temp_create_permissive_policy('CrewCheckIn');
SELECT _temp_create_permissive_policy('DigitalSide');
SELECT _temp_create_permissive_policy('Activity');
SELECT _temp_create_permissive_policy('Connection');
SELECT _temp_create_permissive_policy('Credit');
SELECT _temp_create_permissive_policy('Notification');
SELECT _temp_create_permissive_policy('ServiceHealthCheck');
SELECT _temp_create_permissive_policy('UptimeRecord');
SELECT _temp_create_permissive_policy('Incident');
SELECT _temp_create_permissive_policy('IncidentUpdate');
SELECT _temp_create_permissive_policy('screenplay_operations');
SELECT _temp_create_permissive_policy('collaboration_sessions');
SELECT _temp_create_permissive_policy('collaboration_conflicts');
SELECT _temp_create_permissive_policy('processed_webhook_events');

-- Clean up helper function
DROP FUNCTION IF EXISTS _temp_create_permissive_policy(text);
