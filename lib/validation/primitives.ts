/**
 * Primitive validation schemas for common patterns.
 * These are building blocks for domain-specific schemas.
 */
import { z } from 'zod';

// =============================================================================
// ID Schemas
// =============================================================================

/**
 * CUID validation (Prisma default ID format).
 * Format: c[a-z0-9]{24} (25 chars total, starts with 'c')
 */
export const cuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24,}$/, 'Invalid ID format');

/**
 * UUID v4 validation.
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Generic ID that accepts either CUID or UUID.
 */
export const idSchema = z
  .string()
  .min(1, 'ID is required')
  .refine(
    (val) => /^c[a-z0-9]{24,}$/.test(val) || /^[a-f0-9-]{36}$/i.test(val),
    'Invalid ID format'
  );

// =============================================================================
// String Schemas
// =============================================================================

/**
 * Title/name field - required, trimmed, max 255 chars.
 */
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(255, 'Title must be 255 characters or less')
  .trim();

/**
 * Optional description field - trimmed, max 2000 chars.
 */
export const descriptionSchema = z
  .string()
  .max(2000, 'Description must be 2000 characters or less')
  .trim()
  .optional();

/**
 * Short text field - max 500 chars (for loglines, bios, etc.)
 */
export const shortTextSchema = z
  .string()
  .max(500, 'Text must be 500 characters or less')
  .trim();

/**
 * URL-safe slug (lowercase letters, numbers, hyphens).
 */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .max(100, 'Slug must be 100 characters or less');

// =============================================================================
// Contact Schemas
// =============================================================================

/**
 * Email validation with max length.
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be 255 characters or less');

/**
 * URL validation with max length.
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL must be 2048 characters or less');

/**
 * Phone number (loose validation - allows various formats).
 */
export const phoneSchema = z
  .string()
  .regex(/^[+\d\s()-]{7,20}$/, 'Invalid phone number')
  .max(50, 'Phone number must be 50 characters or less');

// =============================================================================
// Pagination Schemas
// =============================================================================

/**
 * Standard pagination parameters.
 */
export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be 100 or less')
    .default(50),
  offset: z.coerce
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be 0 or greater')
    .default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

// =============================================================================
// Date Schemas
// =============================================================================

/**
 * ISO date string (YYYY-MM-DD).
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Year (reasonable range for copyright, etc.)
 */
export const yearSchema = z
  .number()
  .int('Year must be an integer')
  .min(1900, 'Year must be 1900 or later')
  .max(2100, 'Year must be 2100 or earlier');

// =============================================================================
// Nullable Variants
// =============================================================================

/**
 * Helper to make a schema nullable and optional (common pattern for update operations).
 */
export function nullableOptional<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable().optional();
}

// =============================================================================
// Type Exports
// =============================================================================

export type Cuid = z.infer<typeof cuidSchema>;
export type Title = z.infer<typeof titleSchema>;
export type Description = z.infer<typeof descriptionSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Url = z.infer<typeof urlSchema>;
