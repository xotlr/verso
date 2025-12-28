/**
 * Import Quip Matchers
 * Pattern matching logic for title-based quip selection
 */

import type { PoolSelector } from '../../types';
import { knownTitles, patternQuips, genericQuips, specialCaseQuips } from './pools';

interface TitleMatcher {
  id: string;
  matches: (title: string, normalized: string) => boolean;
  getQuips: () => string[];
}

// Pattern definitions - order matters (most specific first)
const patterns: TitleMatcher[] = [
  // File naming quirks
  {
    id: 'final_final',
    matches: (_, n) => /final.*final/i.test(n),
    getQuips: () => patternQuips.finalFinal,
  },
  {
    id: 'copy_copy',
    matches: (_, n) => /\(1\)|\(2\)|\(3\)|\(4\)|copy.*copy/i.test(n),
    getQuips: () => patternQuips.copyCopy,
  },
  {
    id: 'version_numbers',
    matches: (_, n) => /v\d+|version\s*\d+|rev\d+/i.test(n),
    getQuips: () => patternQuips.versionNumbers,
  },
  {
    id: 'dated_filename',
    matches: (_, n) => /\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december/i.test(n),
    getQuips: () => patternQuips.datedFilename,
  },

  // Title structure
  {
    id: 'all_caps',
    matches: (t) => /^[A-Z\s]+$/.test(t) && t.length > 3,
    getQuips: () => patternQuips.allCaps,
  },
  {
    id: 'all_lowercase',
    matches: (t) => /^[a-z]+$/.test(t),
    getQuips: () => patternQuips.allLowercase,
  },
  {
    id: 'question',
    matches: (t) => t.endsWith('?'),
    getQuips: () => patternQuips.question,
  },
  {
    id: 'exclamation',
    matches: (t) => t.endsWith('!'),
    getQuips: () => patternQuips.exclamation,
  },
  {
    id: 'colon',
    matches: (t) => t.includes(':'),
    getQuips: () => patternQuips.colon,
  },

  // Sequel patterns
  {
    id: 'part_2',
    matches: (_, n) => /\b(part|episode|chapter)\s*(2|ii|two)\b/i.test(n),
    getQuips: () => patternQuips.part2,
  },
  {
    id: 'part_3',
    matches: (_, n) => /\b(part|episode|chapter)\s*(3|iii|three)\b/i.test(n),
    getQuips: () => patternQuips.part3,
  },
  {
    id: 'returns',
    matches: (_, n) => /\breturns?\b|\brises?\b|\breloaded\b|\brevolution\b/i.test(n),
    getQuips: () => patternQuips.returns,
  },
  {
    id: 'year_in_title',
    matches: (_, n) => /\d{4}\b/.test(n),
    getQuips: () => patternQuips.yearInTitle,
  },

  // Content/genre markers
  {
    id: 'untitled',
    matches: (_, n) => /untitled/i.test(n),
    getQuips: () => patternQuips.untitled,
  },
  {
    id: 'pilot',
    matches: (_, n) => /pilot/i.test(n),
    getQuips: () => patternQuips.pilot,
  },
  {
    id: 'episode',
    matches: (_, n) => /episode\s*\d/i.test(n),
    getQuips: () => patternQuips.episode,
  },
  {
    id: 'draft',
    matches: (_, n) => /draft/i.test(n) && !/final\s*draft/i.test(n),
    getQuips: () => patternQuips.draft,
  },
  {
    id: 'final_draft',
    matches: (_, n) => /final\s*draft/i.test(n),
    getQuips: () => patternQuips.finalDraft,
  },
  {
    id: 'revision',
    matches: (_, n) => /revision|rev\s*\d/i.test(n),
    getQuips: () => patternQuips.revision,
  },
  {
    id: 'short_film',
    matches: (_, n) => /short\s*(film)?/i.test(n),
    getQuips: () => patternQuips.shortFilm,
  },
  {
    id: 'feature',
    matches: (_, n) => /feature/i.test(n),
    getQuips: () => patternQuips.feature,
  },

  // Genre keywords
  {
    id: 'horror',
    matches: (_, n) => /horror/i.test(n),
    getQuips: () => patternQuips.horror,
  },
  {
    id: 'comedy',
    matches: (_, n) => /comedy/i.test(n),
    getQuips: () => patternQuips.comedy,
  },
  {
    id: 'romance',
    matches: (_, n) => /romance|love\s*story/i.test(n),
    getQuips: () => patternQuips.romance,
  },
  {
    id: 'thriller',
    matches: (_, n) => /thriller|suspense/i.test(n),
    getQuips: () => patternQuips.thriller,
  },
  {
    id: 'documentary',
    matches: (_, n) => /documentary|doc\b/i.test(n),
    getQuips: () => patternQuips.documentary,
  },
  {
    id: 'musical',
    matches: (_, n) => /musical/i.test(n),
    getQuips: () => patternQuips.musical,
  },
  {
    id: 'western',
    matches: (_, n) => /western/i.test(n),
    getQuips: () => patternQuips.western,
  },
  {
    id: 'scifi',
    matches: (_, n) => /sci-?fi|science\s*fiction/i.test(n),
    getQuips: () => patternQuips.scifi,
  },
  {
    id: 'fantasy',
    matches: (_, n) => /fantasy/i.test(n),
    getQuips: () => patternQuips.fantasy,
  },
  {
    id: 'action',
    matches: (_, n) => /action/i.test(n),
    getQuips: () => patternQuips.action,
  },
  {
    id: 'noir',
    matches: (_, n) => /noir/i.test(n),
    getQuips: () => patternQuips.noir,
  },
  {
    id: 'heist',
    matches: (_, n) => /heist/i.test(n),
    getQuips: () => patternQuips.heist,
  },
  {
    id: 'biopic',
    matches: (_, n) => /biopic|biography/i.test(n),
    getQuips: () => patternQuips.biopic,
  },
  {
    id: 'zombie',
    matches: (_, n) => /zombie/i.test(n),
    getQuips: () => patternQuips.zombie,
  },
  {
    id: 'vampire',
    matches: (_, n) => /vampire/i.test(n),
    getQuips: () => patternQuips.vampire,
  },
  {
    id: 'crime',
    matches: (_, n) => /detective|murder|crime/i.test(n),
    getQuips: () => patternQuips.crime,
  },
  {
    id: 'time_travel',
    matches: (_, n) => /time\s*travel|alternate\s*reality/i.test(n),
    getQuips: () => patternQuips.timeTravel,
  },
  {
    id: 'holiday',
    matches: (_, n) => /christmas|holiday/i.test(n),
    getQuips: () => patternQuips.holiday,
  },

  // Pretentious markers
  {
    id: 'pretentious_latin',
    matches: (_, n) => /\b(requiem|opus|nocturne|sonata|etude|memento|interlude)\b/i.test(n),
    getQuips: () => patternQuips.pretentiousLatin,
  },
  {
    id: 'pretentious_philosophical',
    matches: (_, n) => /\b(eternal|infinite|ephemeral|transcendent|liminal)\b/i.test(n),
    getQuips: () => patternQuips.pretentiousPhilosophical,
  },
];

// Special case checks
const specialCases: TitleMatcher[] = [
  {
    id: 'long_title',
    matches: (t) => t.length > 60,
    getQuips: () => specialCaseQuips.longTitle,
  },
  {
    id: 'short_title',
    matches: (t) => t.split(/\s+/).length <= 2 && t.length < 15,
    getQuips: () => specialCaseQuips.shortTitle,
  },
  {
    id: 'just_number',
    matches: (t) => /^\d+$/.test(t.trim()),
    getQuips: () => specialCaseQuips.justNumber,
  },
];

/**
 * Get import quip for a title using provided picker
 */
export function matchTitle(title: string, picker: PoolSelector): string {
  if (!title?.trim()) return 'New screenplay imported.';

  const normalized = title.toLowerCase().trim();

  // Check special cases first
  for (const matcher of specialCases) {
    if (matcher.matches(title, normalized)) {
      return picker(matcher.getQuips());
    }
  }

  // Check patterns
  for (const matcher of patterns) {
    if (matcher.matches(title, normalized)) {
      return picker(matcher.getQuips());
    }
  }

  // Check known titles
  for (const [key, quips] of Object.entries(knownTitles)) {
    if (normalized.includes(key)) {
      return picker(quips);
    }
  }

  // Generic fallback
  const template = picker(genericQuips.templates.map(fn => fn(title)));
  return template;
}
