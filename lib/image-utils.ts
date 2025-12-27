/**
 * Generate a simple SVG placeholder for images.
 * Returns a base64-encoded data URL that can be used as a blur placeholder.
 */
export function generatePlaceholder(width: number, height: number): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate an avatar-specific gradient placeholder.
 * Uses a hash of the userId to generate consistent colors for the same user.
 */
export function generateAvatarPlaceholder(userId: string): string {
  // Simple hash function for consistent color generation
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  const hue2 = (hue + 60) % 360;

  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${hue},70%,85%)"/>
        <stop offset="100%" style="stop-color:hsl(${hue2},70%,75%)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Default blur placeholder for avatars (neutral gray gradient).
 * Use this when userId is not available.
 */
export const DEFAULT_AVATAR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+';

/**
 * Map component size names to pixel values for image optimization.
 */
export const AVATAR_SIZE_MAP = {
  xs: 20,
  sm: 40,
  md: 96,
  lg: 128,
  xl: 192,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZE_MAP;
