/**
 * URL Metadata Fetcher
 *
 * Fetches Open Graph and meta information from URLs for link preview cards.
 * Enhanced with embed detection for YouTube, Pinterest, Google Docs, etc.
 *
 * SECURITY: Includes SSRF protection to prevent requests to internal networks.
 */

import * as cheerio from 'cheerio';
import { detectEmbedType, type EmbedType, type EmbedInfo } from './export/embed';
import { logger } from './logger';

/**
 * Check if a URL is safe from SSRF attacks.
 * Blocks requests to internal/private IP addresses and localhost.
 *
 * @param url - The URL to validate
 * @returns true if safe, false if potentially dangerous
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https schemes
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variations
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    ) {
      return false;
    }

    // Block internal/private IP ranges
    // IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    // IPv4 loopback: 127.x.x.x
    // IPv4 link-local: 169.254.x.x
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      if (
        a === 10 || // 10.0.0.0/8
        a === 127 || // 127.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
        a === 0 // 0.0.0.0/8
      ) {
        return false;
      }
    }

    // Block IPv6 private/reserved addresses
    if (hostname.startsWith('[')) {
      // IPv6 in URL format [::1]
      const ipv6 = hostname.slice(1, -1).toLowerCase();
      if (
        ipv6 === '::1' ||
        ipv6.startsWith('fe80:') || // Link-local
        ipv6.startsWith('fc') || // Unique local
        ipv6.startsWith('fd') || // Unique local
        ipv6 === '::' // Unspecified
      ) {
        return false;
      }
    }

    // Block cloud metadata endpoints (AWS, GCP, Azure)
    const metadataHosts = [
      '169.254.169.254', // AWS/GCP metadata
      'metadata.google.internal',
      'metadata.google',
      '169.254.170.2', // AWS ECS metadata
    ];
    if (metadataHosts.includes(hostname)) {
      return false;
    }

    return true;
  } catch {
    // Invalid URL
    return false;
  }
}

export interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  // Enhanced embed fields
  embedType: EmbedType;
  embedId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  isPlayable: boolean;
}

/**
 * Fetch YouTube metadata using oEmbed (no API key needed)
 */
async function fetchYouTubeMetadata(url: string, embedInfo: EmbedInfo): Promise<Partial<UrlMetadata>> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || null,
        description: null, // oEmbed doesn't provide description
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico',
        image: embedInfo.thumbnailUrl, // Use high-res thumbnail
        thumbnailUrl: embedInfo.thumbnailUrl,
      };
    }
  } catch {
    // Fall through to generic
  }
  return {};
}

/**
 * Fetch Vimeo metadata using oEmbed
 */
async function fetchVimeoMetadata(url: string, _embedInfo: EmbedInfo): Promise<Partial<UrlMetadata>> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || null,
        description: data.description || null,
        siteName: 'Vimeo',
        favicon: 'https://vimeo.com/favicon.ico',
        image: data.thumbnail_url || null,
        thumbnailUrl: data.thumbnail_url || null,
      };
    }
  } catch {
    // Fall through to generic
  }
  return {};
}

/**
 * Fetch metadata from a URL with enhanced embed detection.
 * Includes SSRF protection to prevent requests to internal networks.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  // SECURITY: SSRF protection - validate URL before fetching
  if (!isSafeUrl(url)) {
    logger.security('SSRF: Blocked request to potentially dangerous URL', {
      url: url.substring(0, 100), // Truncate for logging
    });
    // Return empty metadata for blocked URLs
    return {
      url,
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
      embedType: 'generic',
      embedId: null,
      embedUrl: null,
      thumbnailUrl: null,
      isPlayable: false,
    };
  }

  // First, detect embed type
  const embedInfo = detectEmbedType(url);

  const result: UrlMetadata = {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName: null,
    // Embed fields from detection
    embedType: embedInfo.type,
    embedId: embedInfo.embedId,
    embedUrl: embedInfo.embedUrl,
    thumbnailUrl: embedInfo.thumbnailUrl,
    isPlayable: embedInfo.isPlayable,
  };

  try {
    // For video platforms, try oEmbed first
    if (embedInfo.type === 'youtube') {
      const ytMetadata = await fetchYouTubeMetadata(url, embedInfo);
      Object.assign(result, ytMetadata);
      // If we got title from oEmbed, we're done
      if (result.title) {
        return result;
      }
    }

    if (embedInfo.type === 'vimeo') {
      const vimeoMetadata = await fetchVimeoMetadata(url, embedInfo);
      Object.assign(result, vimeoMetadata);
      if (result.title) {
        return result;
      }
    }

    // Validate URL
    const parsedUrl = new URL(url);

    // Fetch the page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Verso/1.0; +https://verso.ac)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Open Graph tags (preferred)
    result.title = result.title || $('meta[property="og:title"]').attr('content') || null;
    result.description = result.description || $('meta[property="og:description"]').attr('content') || null;
    result.image = result.image || $('meta[property="og:image"]').attr('content') || null;
    result.siteName = result.siteName || $('meta[property="og:site_name"]').attr('content') || null;

    // Twitter Card fallbacks
    if (!result.title) {
      result.title = $('meta[name="twitter:title"]').attr('content') || null;
    }
    if (!result.description) {
      result.description = $('meta[name="twitter:description"]').attr('content') || null;
    }
    if (!result.image) {
      result.image = $('meta[name="twitter:image"]').attr('content') || null;
    }

    // Standard meta fallbacks
    if (!result.title) {
      result.title = $('title').text().trim() || null;
    }
    if (!result.description) {
      result.description = $('meta[name="description"]').attr('content') || null;
    }

    // Favicon
    if (!result.favicon) {
      const iconLink = $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        $('link[rel="apple-touch-icon"]').attr('href');

      if (iconLink) {
        // Make absolute URL
        result.favicon = new URL(iconLink, parsedUrl.origin).href;
      } else {
        // Default to /favicon.ico
        result.favicon = `${parsedUrl.origin}/favicon.ico`;
      }
    }

    // Make image URL absolute if relative
    if (result.image && !result.image.startsWith('http')) {
      result.image = new URL(result.image, parsedUrl.origin).href;
    }

    // Use OG image as thumbnail if we don't have a platform-specific one
    if (!result.thumbnailUrl && result.image) {
      result.thumbnailUrl = result.image;
    }

    // Extract site name from URL if not found
    if (!result.siteName) {
      result.siteName = parsedUrl.hostname.replace(/^www\./, '');
    }

  } catch {
    // Return partial result with URL info
    try {
      const parsedUrl = new URL(url);
      if (!result.siteName) {
        result.siteName = parsedUrl.hostname.replace(/^www\./, '');
      }
      if (!result.favicon) {
        result.favicon = `${parsedUrl.origin}/favicon.ico`;
      }
    } catch {
      // Invalid URL
    }
  }

  return result;
}

/**
 * Detect link category based on URL
 */
export function detectLinkCategory(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  // Google Docs/Drive
  if (hostname.includes('docs.google.com') || hostname.includes('drive.google.com')) {
    return 'script';
  }

  // Research/Reference sites
  if (
    hostname.includes('wikipedia.org') ||
    hostname.includes('imdb.com') ||
    hostname.includes('britannica.com')
  ) {
    return 'research';
  }

  // Script hosting
  if (
    hostname.includes('scripts.com') ||
    hostname.includes('imsdb.com') ||
    hostname.includes('simplyscripts.com')
  ) {
    return 'reference';
  }

  // Video platforms
  if (
    hostname.includes('youtube.com') ||
    hostname.includes('youtu.be') ||
    hostname.includes('vimeo.com')
  ) {
    return 'reference';
  }

  // Visual reference platforms
  if (
    hostname.includes('pinterest.com') ||
    hostname.includes('shotdeck.com') ||
    hostname.includes('canva.com')
  ) {
    return 'reference';
  }

  return 'other';
}
