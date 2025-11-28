/**
 * URL Metadata Fetcher
 *
 * Fetches Open Graph and meta information from URLs for link preview cards.
 */

import * as cheerio from 'cheerio';

export interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
}

/**
 * Fetch metadata from a URL
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const result: UrlMetadata = {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName: null,
  };

  try {
    // Validate URL
    const parsedUrl = new URL(url);

    // Fetch the page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Verso/1.0; +https://verso.ink)',
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
    result.title = $('meta[property="og:title"]').attr('content') || null;
    result.description = $('meta[property="og:description"]').attr('content') || null;
    result.image = $('meta[property="og:image"]').attr('content') || null;
    result.siteName = $('meta[property="og:site_name"]').attr('content') || null;

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

    // Make image URL absolute if relative
    if (result.image && !result.image.startsWith('http')) {
      result.image = new URL(result.image, parsedUrl.origin).href;
    }

    // Extract site name from URL if not found
    if (!result.siteName) {
      result.siteName = parsedUrl.hostname.replace(/^www\./, '');
    }

  } catch (error) {
    // Return partial result with URL info
    try {
      const parsedUrl = new URL(url);
      result.siteName = parsedUrl.hostname.replace(/^www\./, '');
      result.favicon = `${parsedUrl.origin}/favicon.ico`;
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
    hostname.includes('vimeo.com')
  ) {
    return 'reference';
  }

  return 'other';
}
