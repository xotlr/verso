import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize text for safe SVG/HTML rendering.
 * Prevents XSS attacks by escaping dangerous characters.
 */
export function sanitizeText(text: string | null | undefined, maxLength?: number): string {
  if (text == null) return '';

  // Convert to string and trim
  let sanitized = String(text).trim();

  // Remove null bytes and other control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML entities that could be dangerous in SVG context
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Truncate if maxLength specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Sanitize text specifically for D3 .text() which already escapes HTML,
 * but we still want to handle control characters and truncation.
 */
export function sanitizeForD3Text(text: string | null | undefined, maxLength?: number): string {
  if (text == null) return '';

  // Convert to string and trim
  let sanitized = String(text).trim();

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Truncate if maxLength specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}