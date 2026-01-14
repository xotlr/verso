/**
 * Validation schemas for team-related data.
 */
import { z } from 'zod';
import {
  cuidSchema,
  titleSchema,
  descriptionSchema,
  emailSchema,
  slugSchema,
  nullableOptional,
} from './primitives';

// =============================================================================
// Enums
// =============================================================================

/**
 * Team member role.
 */
export const teamRoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER',
]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

/**
 * Team plan/tier.
 */
export const teamPlanSchema = z.enum([
  'FREE',
  'PRO',
  'ENTERPRISE',
]);
export type TeamPlan = z.infer<typeof teamPlanSchema>;

// =============================================================================
// CRUD Schemas
// =============================================================================

/**
 * Create team request body.
 */
export const createTeamSchema = z.object({
  name: titleSchema,
  description: descriptionSchema,
  slug: slugSchema.optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Update team request body.
 */
export const updateTeamSchema = z.object({
  name: titleSchema.optional(),
  description: nullableOptional(descriptionSchema.unwrap()),
  slug: slugSchema.optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

// =============================================================================
// Member Management
// =============================================================================

/**
 * Invite team member request.
 */
export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: teamRoleSchema.default('MEMBER'),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

/**
 * Update team member role request.
 */
export const updateTeamMemberSchema = z.object({
  role: teamRoleSchema,
});

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

// =============================================================================
// Query Params
// =============================================================================

/**
 * List teams query parameters.
 */
export const listTeamsQuerySchema = z.object({
  includeMembers: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;

/**
 * List team members query parameters.
 */
export const listTeamMembersQuerySchema = z.object({
  role: teamRoleSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListTeamMembersQuery = z.infer<typeof listTeamMembersQuerySchema>;
