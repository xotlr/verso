-- Migration: Add auth_id column to User table for Supabase Auth linkage
-- This links our application users to Supabase Auth users (auth.users)
-- Run order: 00001 (FIRST - required before auth functions)

-- ============================================
-- STEP 1: Add auth_id column to User table
-- ============================================

-- Add the auth_id column (UUID type to match auth.users.id)
ALTER TABLE public."User"
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS "User_auth_id_idx" ON public."User" (auth_id);

-- ============================================
-- STEP 2: Create trigger to link auth.users to public.User
-- ============================================

-- Function to create/link User record on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_id TEXT;
BEGIN
  -- Check if user already exists by email (for OAuth linking)
  SELECT id INTO existing_user_id
  FROM public."User"
  WHERE email = NEW.email;

  IF existing_user_id IS NOT NULL THEN
    -- Link existing user to auth user
    UPDATE public."User"
    SET auth_id = NEW.id,
        "updatedAt" = NOW()
    WHERE id = existing_user_id
      AND auth_id IS NULL;  -- Only if not already linked
  ELSE
    -- Create new user record (generates cuid-style ID)
    INSERT INTO public."User" (
      id,
      auth_id,
      email,
      name,
      image,
      "emailVerified",
      "createdAt",
      "updatedAt"
    ) VALUES (
      -- Generate cuid-like ID (24 chars alphanumeric)
      'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- STEP 3: Handle auth user updates (email changes, etc.)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update linked user record
  UPDATE public."User"
  SET
    email = COALESCE(NEW.email, email),
    "emailVerified" = CASE
      WHEN NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL
      THEN NOW()
      ELSE "emailVerified"
    END,
    "updatedAt" = NOW()
  WHERE auth_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger for updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_auth_user_update();

-- ============================================
-- STEP 4: Handle auth user deletion (soft delete cascade)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unlink the auth_id but keep user data
  -- (actual deletion would be handled separately if needed)
  UPDATE public."User"
  SET auth_id = NULL,
      "updatedAt" = NOW()
  WHERE auth_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger for deletions
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_delete();

-- ============================================
-- STEP 5: Create function to get current user with caching hint
-- ============================================

-- Optimized function that uses session context when available
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Try to get from current setting (set by API layer for performance)
  v_user_id := current_setting('app.current_user_id', TRUE);

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Fall back to lookup from auth
  SELECT id INTO v_user_id
  FROM public."User"
  WHERE auth_id = auth.uid();

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- ============================================
-- STEP 6: Add function to set current user (for API layer optimization)
-- ============================================

-- API routes can call this to avoid repeated auth lookups within a request
CREATE OR REPLACE FUNCTION public.set_current_user(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id, TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_current_user(TEXT) TO authenticated;
