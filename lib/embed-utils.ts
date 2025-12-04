/**
 * Embed Detection Utilities
 * Detects embed type from URLs and extracts platform-specific information
 */

export type EmbedType =
  | 'youtube'
  | 'vimeo'
  | 'pinterest'
  | 'shotdeck'
  | 'google-docs'
  | 'google-sheets'
  | 'google-slides'
  | 'canva'
  | 'generic';

export interface EmbedInfo {
  type: EmbedType;
  embedId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  isPlayable: boolean;
}

// URL pattern matchers
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

const VIMEO_PATTERN = /vimeo\.com\/(\d+)/;
const PINTEREST_PATTERN = /pinterest\.com\/pin\/(\d+)/;
const SHOTDECK_PATTERN = /shotdeck\.com/;
const GOOGLE_DOCS_PATTERN = /docs\.google\.com\/(document)\/d\/([a-zA-Z0-9_-]+)/;
const GOOGLE_SHEETS_PATTERN = /docs\.google\.com\/(spreadsheets)\/d\/([a-zA-Z0-9_-]+)/;
const GOOGLE_SLIDES_PATTERN = /docs\.google\.com\/(presentation)\/d\/([a-zA-Z0-9_-]+)/;
const CANVA_PATTERN = /canva\.com\/design\/([a-zA-Z0-9_-]+)/;

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Get YouTube thumbnail URL (tries high-res first)
 */
export function getYouTubeThumbnail(videoId: string): string {
  // maxresdefault is highest quality, falls back gracefully
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Extract Vimeo video ID
 */
export function extractVimeoId(url: string): string | null {
  const match = url.match(VIMEO_PATTERN);
  return match ? match[1] : null;
}

/**
 * Get Vimeo embed URL
 */
export function getVimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Extract Pinterest pin ID
 */
export function extractPinterestPinId(url: string): string | null {
  const match = url.match(PINTEREST_PATTERN);
  return match ? match[1] : null;
}

/**
 * Extract Google Docs/Sheets/Slides info
 */
export function extractGoogleDocInfo(url: string): { type: EmbedType; id: string } | null {
  let match = url.match(GOOGLE_DOCS_PATTERN);
  if (match) {
    return { type: 'google-docs', id: match[2] };
  }

  match = url.match(GOOGLE_SHEETS_PATTERN);
  if (match) {
    return { type: 'google-sheets', id: match[2] };
  }

  match = url.match(GOOGLE_SLIDES_PATTERN);
  if (match) {
    return { type: 'google-slides', id: match[2] };
  }

  return null;
}

/**
 * Extract Canva design ID
 */
export function extractCanvaId(url: string): string | null {
  const match = url.match(CANVA_PATTERN);
  return match ? match[1] : null;
}

/**
 * Main function to detect embed type and extract info from URL
 */
export function detectEmbedType(url: string): EmbedInfo {
  // YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      embedId: youtubeId,
      embedUrl: getYouTubeEmbedUrl(youtubeId),
      thumbnailUrl: getYouTubeThumbnail(youtubeId),
      isPlayable: true,
    };
  }

  // Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      type: 'vimeo',
      embedId: vimeoId,
      embedUrl: getVimeoEmbedUrl(vimeoId),
      thumbnailUrl: null, // Vimeo requires API for thumbnails
      isPlayable: true,
    };
  }

  // Pinterest
  const pinterestId = extractPinterestPinId(url);
  if (pinterestId) {
    return {
      type: 'pinterest',
      embedId: pinterestId,
      embedUrl: null, // Pinterest embeds require JS widget
      thumbnailUrl: null, // Will use OG image
      isPlayable: false,
    };
  }

  // ShotDeck
  if (SHOTDECK_PATTERN.test(url)) {
    return {
      type: 'shotdeck',
      embedId: null,
      embedUrl: null,
      thumbnailUrl: null, // Will use OG image
      isPlayable: false,
    };
  }

  // Google Docs/Sheets/Slides
  const googleDocInfo = extractGoogleDocInfo(url);
  if (googleDocInfo) {
    return {
      type: googleDocInfo.type,
      embedId: googleDocInfo.id,
      embedUrl: null, // Google doesn't allow iframe embeds easily
      thumbnailUrl: null,
      isPlayable: false,
    };
  }

  // Canva
  const canvaId = extractCanvaId(url);
  if (canvaId) {
    return {
      type: 'canva',
      embedId: canvaId,
      embedUrl: null,
      thumbnailUrl: null, // Will use OG image
      isPlayable: false,
    };
  }

  // Generic (unknown)
  return {
    type: 'generic',
    embedId: null,
    embedUrl: null,
    thumbnailUrl: null,
    isPlayable: false,
  };
}

/**
 * Get display name for embed type
 */
export function getEmbedTypeName(type: EmbedType): string {
  const names: Record<EmbedType, string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    pinterest: 'Pinterest',
    shotdeck: 'ShotDeck',
    'google-docs': 'Google Docs',
    'google-sheets': 'Google Sheets',
    'google-slides': 'Google Slides',
    canva: 'Canva',
    generic: 'Link',
  };
  return names[type];
}

/**
 * Check if embed type is a video
 */
export function isVideoEmbed(type: EmbedType): boolean {
  return type === 'youtube' || type === 'vimeo';
}

/**
 * Check if embed type is a Google Workspace document
 */
export function isGoogleDocEmbed(type: EmbedType): boolean {
  return type === 'google-docs' || type === 'google-sheets' || type === 'google-slides';
}
