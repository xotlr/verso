/**
 * Server-side file validation utilities.
 * Validates file URLs, types, and sizes before storing metadata.
 */

import { BadRequestError } from '@/lib/api/errors'

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

// Allowed document types (for future expansion)
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
] as const

// File extension to MIME type mapping
const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

// Maximum file sizes by type (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024,    // 5MB for images
  document: 10 * 1024 * 1024, // 10MB for documents
}

// Allowed URL domains for file storage
const ALLOWED_STORAGE_DOMAINS = [
  // Supabase storage domains
  'supabase.co',
  'supabase.in',
  // Allow subdomains
  '.supabase.co',
  '.supabase.in',
] as const

export type FileCategory = 'image' | 'document'

export interface FileValidationResult {
  valid: boolean
  category: FileCategory
  mimeType: string
  extension: string
  domain: string
}

/**
 * Extract and validate the domain from a URL.
 * Returns the domain if valid, throws if not.
 */
function validateUrlDomain(url: string): string {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new BadRequestError('Invalid URL format')
  }

  // Must be HTTPS in production
  if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
    throw new BadRequestError('URL must use HTTPS')
  }

  const domain = parsedUrl.hostname.toLowerCase()

  // Check against allowed domains
  const isAllowed = ALLOWED_STORAGE_DOMAINS.some((allowed) => {
    if (allowed.startsWith('.')) {
      // Subdomain pattern: .supabase.co matches *.supabase.co
      return domain.endsWith(allowed) || domain === allowed.slice(1)
    }
    return domain === allowed || domain.endsWith(`.${allowed}`)
  })

  if (!isAllowed) {
    throw new BadRequestError(
      'File URL must be from an allowed storage domain',
      { allowedDomains: ALLOWED_STORAGE_DOMAINS.filter((d) => !d.startsWith('.')) }
    )
  }

  return domain
}

/**
 * Extract file extension from URL path.
 */
function getExtensionFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname

    // Remove query params and get the last segment
    const filename = pathname.split('/').pop() || ''
    const extension = filename.split('.').pop()?.toLowerCase() || ''

    return extension
  } catch {
    return ''
  }
}

/**
 * Infer MIME type from file extension.
 */
function getMimeTypeFromExtension(extension: string): string | null {
  return EXTENSION_TO_MIME[extension] || null
}

/**
 * Determine file category from MIME type.
 */
function getCategoryFromMimeType(mimeType: string): FileCategory | null {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return 'image'
  }
  if ((ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType)) {
    return 'document'
  }
  return null
}

/**
 * Validate a file URL for storage.
 * Checks domain, extension, and infers type.
 */
export function validateFileUrl(url: string): FileValidationResult {
  // Validate domain first
  const domain = validateUrlDomain(url)

  // Extract and validate extension
  const extension = getExtensionFromUrl(url)
  if (!extension) {
    throw new BadRequestError('Could not determine file type from URL')
  }

  // Get MIME type from extension
  const mimeType = getMimeTypeFromExtension(extension)
  if (!mimeType) {
    throw new BadRequestError(
      `Unsupported file type: .${extension}`,
      { allowedExtensions: Object.keys(EXTENSION_TO_MIME) }
    )
  }

  // Determine category
  const category = getCategoryFromMimeType(mimeType)
  if (!category) {
    throw new BadRequestError('File type not allowed')
  }

  return {
    valid: true,
    category,
    mimeType,
    extension,
    domain,
  }
}

/**
 * Validate an image URL specifically.
 * More restrictive than general file validation.
 */
export function validateImageUrl(url: string): FileValidationResult {
  const result = validateFileUrl(url)

  if (result.category !== 'image') {
    throw new BadRequestError(
      'URL must point to an image file',
      { allowedTypes: ['jpeg', 'png', 'gif', 'webp'] }
    )
  }

  return result
}

/**
 * Validate file metadata (for when we have Content-Length etc).
 */
export function validateFileSize(size: number, category: FileCategory): void {
  const maxSize = MAX_FILE_SIZES[category]

  if (size > maxSize) {
    const maxMB = maxSize / (1024 * 1024)
    throw new BadRequestError(
      `File too large. Maximum size for ${category}s is ${maxMB}MB`,
      { maxSize, actualSize: size }
    )
  }
}

/**
 * Validate a raw file (File/Blob object).
 * Used for server-side upload endpoints.
 */
export function validateFile(
  file: { type: string; size: number; name?: string },
  allowedCategories: FileCategory[] = ['image']
): { category: FileCategory; mimeType: string } {
  const mimeType = file.type.toLowerCase()

  // Check if MIME type is allowed
  const category = getCategoryFromMimeType(mimeType)
  if (!category || !allowedCategories.includes(category)) {
    const allowedTypes = allowedCategories.flatMap((cat) =>
      cat === 'image' ? [...ALLOWED_IMAGE_TYPES] : [...ALLOWED_DOCUMENT_TYPES]
    )
    throw new BadRequestError(
      'Invalid file type',
      { allowedTypes, receivedType: mimeType }
    )
  }

  // Check file size
  validateFileSize(file.size, category)

  return { category, mimeType }
}

/**
 * Validate magic bytes (file signature) for additional security.
 * Prevents MIME type spoofing.
 */
export function validateMagicBytes(
  buffer: ArrayBuffer,
  expectedMimeType: string
): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, need to also check for WEBP
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  }

  const expectedSignatures = signatures[expectedMimeType]
  if (!expectedSignatures) {
    // No signature check available for this type
    return true
  }

  return expectedSignatures.some((sig) =>
    sig.every((byte, index) => bytes[index] === byte)
  )
}

/**
 * Sanitize filename for storage.
 * Removes path traversal attempts and invalid characters.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.split(/[/\\]/).pop() || 'file'

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  // Replace spaces and special chars with underscores
  sanitized = sanitized.replace(/[^\w.-]/g, '_')

  // Prevent double extensions that could be exploited
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    const ext = parts.pop()
    sanitized = parts.join('_') + '.' + ext
  }

  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop() || ''
    const name = sanitized.slice(0, 100 - ext.length - 1)
    sanitized = name + '.' + ext
  }

  return sanitized || 'file'
}

/**
 * Generate a safe storage path for a file.
 */
export function generateStoragePath(
  userId: string,
  filename: string,
  category: FileCategory
): string {
  const sanitized = sanitizeFilename(filename)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  // Format: userId/category/timestamp-random-filename
  return `${userId}/${category}/${timestamp}-${random}-${sanitized}`
}
