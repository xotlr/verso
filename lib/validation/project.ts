/**
 * Validation schemas for project-related data.
 */
import { z } from 'zod';
import {
  cuidSchema,
  titleSchema,
  descriptionSchema,
  nullableOptional,
} from './primitives';

// =============================================================================
// Enums
// =============================================================================

/**
 * Project status.
 */
export const projectStatusSchema = z.enum([
  'ACTIVE',
  'ARCHIVED',
  'COMPLETED',
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/**
 * Project type.
 */
export const projectTypeSchema = z.enum([
  'FILM',
  'TV',
  'OTHER',
]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

// =============================================================================
// CRUD Schemas
// =============================================================================

/**
 * Create project request body.
 */
export const createProjectSchema = z.object({
  name: titleSchema,
  description: descriptionSchema,
  teamId: cuidSchema.optional(),
  type: projectTypeSchema.optional(),
  status: projectStatusSchema.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Update project request body.
 */
export const updateProjectSchema = z.object({
  name: titleSchema.optional(),
  description: nullableOptional(descriptionSchema.unwrap()),
  teamId: nullableOptional(cuidSchema),
  type: projectTypeSchema.optional(),
  status: projectStatusSchema.optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// =============================================================================
// Query Params
// =============================================================================

/**
 * List projects query parameters.
 */
export const listProjectsQuerySchema = z.object({
  teamId: cuidSchema.optional(),
  status: projectStatusSchema.optional(),
  type: projectTypeSchema.optional(),
  archived: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

// =============================================================================
// Move Operations
// =============================================================================

/**
 * Move project to team request.
 */
export const moveProjectToTeamSchema = z.object({
  teamId: cuidSchema.nullable(),
});

export type MoveProjectToTeamInput = z.infer<typeof moveProjectToTeamSchema>;
