# Supabase Migration Guide

This directory contains the Supabase migrations and documentation for migrating from Prisma + NextAuth to Supabase Database + Auth + RLS.

## Directory Structure

```
supabase/
├── migrations/
│   ├── 00001_auth_functions.sql    # Helper functions for RLS policies
│   ├── 00002_add_auth_id.sql       # Add auth_id column to User table
│   └── 00003_rls_policies.sql      # Row Level Security policies
└── README.md                        # This file
```

## Migration Overview

### Before (Prisma + NextAuth)
- Authentication: NextAuth.js with Google OAuth + credentials
- Authorization: Manual checks in every API route (`lib/auth-utils.ts`)
- Database: Prisma ORM with PostgreSQL

### After (Supabase)
- Authentication: Supabase Auth (Google OAuth, magic link, password)
- Authorization: Row Level Security (RLS) policies in PostgreSQL
- Database: Supabase PostgreSQL with typed client

## Feature Flags

The migration uses feature flags for gradual rollout:

```env
# .env
USE_SUPABASE_AUTH=false  # Set to true to enable Supabase Auth
USE_SUPABASE_DB=false    # Set to true to enable Supabase DB + RLS
```

Migration phases:
1. **Both false**: Original system (Prisma + NextAuth)
2. **AUTH=true, DB=false**: Hybrid mode - Supabase auth, Prisma data
3. **Both true**: Full Supabase (auth + RLS)

## Running Migrations

### Prerequisites

1. Supabase project created and configured
2. Environment variables set:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

### Step 1: Run SQL Migrations

Connect to your Supabase SQL Editor and run in order:

```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL Editor
# Run each file in migrations/ folder in order
```

### Step 2: Migrate Users

```bash
# Dry run first
npx tsx scripts/migrate-users-to-supabase.ts --dry-run

# Actual migration
npx tsx scripts/migrate-users-to-supabase.ts
```

### Step 3: Enable Feature Flags

```env
# First enable auth
USE_SUPABASE_AUTH=true
USE_SUPABASE_DB=false

# Test thoroughly, then enable DB
USE_SUPABASE_AUTH=true
USE_SUPABASE_DB=true
```

### Step 4: Update API Routes

Migrate API routes from Prisma to Supabase:

**Before (Prisma + manual auth):**
```typescript
import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/prisma';
import { checkScreenplayAccess } from '@/lib/auth-utils';

export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { id } = params;

    // Manual authorization check
    const access = await checkScreenplayAccess(id, user.id);
    if (!access.allowed) {
      throw new ForbiddenError();
    }

    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
    });

    return { screenplay };
  },
});
```

**After (Supabase + RLS):**
```typescript
import { createApiHandler } from '@/lib/api/handler.supabase';

export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, supabase, params }) => {
    const { id } = params;

    // RLS handles authorization - no manual check needed!
    const { data: screenplay, error } = await supabase
      .from('Screenplay')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') {
      throw new NotFoundError('Screenplay');
    }

    return { screenplay };
  },
});
```

## RLS Policy Reference

### Access Patterns

| Resource | Owner | Team Member | Shared (role) | Public |
|----------|-------|-------------|---------------|--------|
| User | Full | - | - | Read if isPublic |
| Team | Full | Read | - | Read if isPublic |
| Project | Full | Full | role-based | Read if published |
| Screenplay | Full | Full | role-based | Read if published |
| Series | Full | Via project | role-based | - |
| Child resources | Via parent | Via parent | Via parent | - |

### Share Roles Hierarchy

`VIEWER` < `COMMENTER` < `EDITOR` < `ADMIN`

- VIEWER: Read only
- COMMENTER: Read + comment
- EDITOR: Read + write
- ADMIN: Read + write + manage sharing

### Team Roles Hierarchy

`MEMBER` < `ADMIN` < `OWNER`

## Helper Functions

Available in RLS policies and callable from the application:

```sql
-- Get current user's ID (app User.id, not auth.users.id)
SELECT public.current_user_id();

-- Check team membership
SELECT public.is_team_member('team_id');
SELECT public.is_team_admin('team_id');

-- Check resource access
SELECT public.can_access_screenplay('screenplay_id', NULL, 'EDITOR');
SELECT public.can_access_project('project_id');
SELECT public.can_access_series('series_id');
```

## Rollback

If issues are found after enabling Supabase:

1. Set feature flags back to `false`:
   ```env
   USE_SUPABASE_AUTH=false
   USE_SUPABASE_DB=false
   ```

2. Redeploy

3. Users will need to re-login (NextAuth sessions)

## Verification Checklist

After each migration phase, verify:

- [ ] Login/signup works (Google OAuth + email)
- [ ] Existing users can access their data
- [ ] Team members can access shared resources
- [ ] Public screenplays/projects are viewable
- [ ] Create/update/delete operations work
- [ ] Real-time collaboration works
- [ ] No authorization errors in logs
- [ ] Performance is acceptable (< 100ms for list queries)

## Troubleshooting

### "permission denied for table"
RLS is enabled but user doesn't have access. Check:
1. User has valid session (auth_id set)
2. RLS policies allow the operation
3. User has required role for the action

### "Could not find the function"
Missing SQL migration. Re-run 00001_auth_functions.sql.

### Slow queries
Check if RLS policies are using indexes. Run EXPLAIN on slow queries.

### OAuth callback errors
Verify redirect URLs are configured in Supabase Auth settings:
- `https://verso.ac/auth/callback`
- `https://app.verso.ac/auth/callback`
- `http://localhost:3000/auth/callback` (dev)
