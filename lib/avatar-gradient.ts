/**
 * Avatar Gradient Generator
 * Generates unique, consistent aurora-style mesh gradients based on user IDs
 */

/**
 * Simple hash function to convert a string to a number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate HSL color from hash - vibrant aurora colors
 */
function hashToAuroraHSL(hash: number, offset: number = 0): string {
  const hue = (hash + offset * 97) % 360; // Different offset for variety
  const saturation = 70 + (hash % 25); // 70-95% - more saturated
  const lightness = 50 + (hash % 20); // 50-70%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate a darker base color for backgrounds
 */
function hashToBaseColor(hash: number): string {
  const hue = hash % 360;
  const saturation = 30 + (hash % 20); // 30-50% - less saturated
  const lightness = 15 + (hash % 15); // 15-30% - dark
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate a mesh gradient CSS string based on user ID
 * Creates an aurora-style gradient with a dark base and colorful highlights
 */
export function generateMeshGradient(userId: string): string {
  const hash = hashString(userId);

  // Base dark color
  const baseColor = hashToBaseColor(hash);

  // Aurora highlight colors (semi-transparent)
  const aurora1 = hashToAuroraHSL(hash, 0);
  const aurora2 = hashToAuroraHSL(hash, 1);
  const aurora3 = hashToAuroraHSL(hash, 2);

  // Create mesh gradient with dark base and aurora overlays
  return `
    radial-gradient(ellipse 80% 50% at 20% 30%, ${aurora1}40 0%, transparent 50%),
    radial-gradient(ellipse 60% 80% at 80% 20%, ${aurora2}35 0%, transparent 50%),
    radial-gradient(ellipse 70% 60% at 50% 80%, ${aurora3}30 0%, transparent 50%),
    linear-gradient(180deg, ${baseColor} 0%, ${baseColor} 100%)
  `.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a simpler gradient for smaller avatars
 */
export function generateSimpleGradient(userId: string): string {
  const hash = hashString(userId);

  const color1 = hashToAuroraHSL(hash, 0);
  const color2 = hashToAuroraHSL(hash, 2);

  const angle = (hash % 180) + 90; // 90-270 degrees for nice diagonals

  return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

/**
 * Generate gradient colors array for use in components
 */
export function getGradientColors(userId: string): string[] {
  const hash = hashString(userId);

  return [
    hashToAuroraHSL(hash, 0),
    hashToAuroraHSL(hash, 1),
    hashToAuroraHSL(hash, 2),
    hashToAuroraHSL(hash, 3),
  ];
}

/**
 * Get a single primary color from user ID (useful for borders, accents)
 */
export function getPrimaryColor(userId: string): string {
  const hash = hashString(userId);
  return hashToAuroraHSL(hash, 0);
}

/**
 * Get the base dark color for backgrounds
 */
export function getBaseColor(userId: string): string {
  const hash = hashString(userId);
  return hashToBaseColor(hash);
}

/**
 * Generate CSS style object for use in React components (banner/large areas)
 */
export function getMeshGradientStyle(userId: string): React.CSSProperties {
  return {
    background: generateMeshGradient(userId),
  };
}

/**
 * Generate CSS style object for simple gradient (avatars)
 */
export function getSimpleGradientStyle(userId: string): React.CSSProperties {
  return {
    background: generateSimpleGradient(userId),
  };
}
