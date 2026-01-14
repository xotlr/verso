/**
 * Validation schemas for screenplay-related data.
 */
import { z } from 'zod';
import {
  cuidSchema,
  titleSchema,
  descriptionSchema,
  shortTextSchema,
  emailSchema,
  phoneSchema,
  yearSchema,
  dateStringSchema,
  nullableOptional,
} from './primitives';

// =============================================================================
// Enums
// =============================================================================

/**
 * Screenplay type (format).
 */
export const screenplayTypeSchema = z.enum(['FEATURE', 'TV', 'SHORT']);
export type ScreenplayType = z.infer<typeof screenplayTypeSchema>;

/**
 * Screenplay format for database (FILM maps to FEATURE/SHORT).
 */
export const screenplayFormatSchema = z.enum(['FILM', 'TV']);
export type ScreenplayFormat = z.infer<typeof screenplayFormatSchema>;

// =============================================================================
// Title Page Fields
// =============================================================================

/**
 * Title page contact and copyright information.
 */
export const titlePageFieldsSchema = z.object({
  // Contact info
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: emailSchema.nullable().optional(),
  contactPhone: phoneSchema.nullable().optional(),
  contactAddress: z.string().max(500).nullable().optional(),

  // Copyright info
  copyrightYear: yearSchema.nullable().optional(),
  copyrightHolder: z.string().max(255).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),

  // Draft info
  draftLabel: z.string().max(100).nullable().optional(),
  draftDate: dateStringSchema.nullable().optional(),

  // Visibility toggles
  showTitlePageContact: z.boolean().optional(),
  showTitlePageCopyright: z.boolean().optional(),
  showTitlePageDraft: z.boolean().optional(),
});

export type TitlePageFields = z.infer<typeof titlePageFieldsSchema>;

// =============================================================================
// CRUD Schemas
// =============================================================================

/**
 * Create screenplay request body.
 */
export const createScreenplaySchema = z.object({
  title: titleSchema,
  content: z.string().default(''),
  synopsis: descriptionSchema,
  projectId: cuidSchema.optional(),
  teamId: cuidSchema.optional(),
  type: screenplayFormatSchema.optional(),
  season: z.number().int().positive().nullable().optional(),
  episode: z.number().int().positive().nullable().optional(),
  episodeTitle: z.string().max(255).nullable().optional(),
  logline: shortTextSchema.nullable().optional(),
  genre: z.string().max(50).nullable().optional(),
  author: z.string().max(500).nullable().optional(),
});

export type CreateScreenplayInput = z.infer<typeof createScreenplaySchema>;

/**
 * Update screenplay request body (all fields optional).
 */
export const updateScreenplaySchema = z.object({
  title: titleSchema.optional(),
  content: z.string().optional(),
  synopsis: nullableOptional(descriptionSchema.unwrap()),
  projectId: nullableOptional(cuidSchema),
  teamId: nullableOptional(cuidSchema),
  stackId: nullableOptional(cuidSchema),
  seriesId: nullableOptional(cuidSchema),
  seasonRefId: nullableOptional(cuidSchema),
  type: screenplayFormatSchema.optional(),
  season: nullableOptional(z.number().int().positive()),
  episode: nullableOptional(z.number().int().positive()),
  episodeTitle: nullableOptional(z.string().max(255)),
  logline: nullableOptional(shortTextSchema),
  genre: nullableOptional(z.string().max(50)),
  author: nullableOptional(z.string().max(500)),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  // Title page fields (flattened)
  ...titlePageFieldsSchema.shape,
});

export type UpdateScreenplayInput = z.infer<typeof updateScreenplaySchema>;

// =============================================================================
// Query Params
// =============================================================================

/**
 * List screenplays query parameters.
 */
export const listScreenplaysQuerySchema = z.object({
  projectId: cuidSchema.optional(),
  teamId: cuidSchema.optional(),
  seriesId: cuidSchema.optional(),
  standalone: z.enum(['true', 'false']).optional(),
  favorites: z.enum(['true', 'false']).optional(),
  recent: z.enum(['true', 'false']).optional(),
  hasProject: z.enum(['true', 'false']).optional(),
  genre: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListScreenplaysQuery = z.infer<typeof listScreenplaysQuerySchema>;

// =============================================================================
// Metadata Schema (for useScreenplayMetadata hook)
// =============================================================================

/**
 * Screenplay metadata state shape.
 */
export const screenplayMetadataSchema = z.object({
  screenplayType: screenplayTypeSchema.default('FEATURE'),
  season: z.number().int().positive().nullable().default(null),
  episode: z.number().int().positive().nullable().default(null),
  episodeTitle: z.string().nullable().default(null),
  logline: z.string().nullable().default(null),
  genre: z.string().nullable().default(null),
  author: z.string().nullable().default(null),
  titlePageFields: titlePageFieldsSchema.default({}),
});

export type ScreenplayMetadata = z.infer<typeof screenplayMetadataSchema>;
