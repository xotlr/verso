// Simplified template types for screenplay creation wizard

export type ScreenplayTypeId = 'film' | 'tv-series' | 'blank';

// Maps to Prisma's ScreenplayType enum
export type DatabaseScreenplayType = 'FILM' | 'TV';

// Display type for cards (excludes blank since it's only for creation)
export type DisplayScreenplayType = 'FILM' | 'TV';

export type TVFormat = 'drama' | 'sitcom' | 'pilot';

export interface ScreenplayTypeConfig {
  id: ScreenplayTypeId;
  name: string;
  description: string;
  dbType: DatabaseScreenplayType;
  gradient: string;
  gradientSelected: string;
  color: string;
  iconName: 'Film' | 'Tv' | 'FileText';
  // Accent color for card variations
  accentColor: string;
}

export const screenplayTypes: Record<ScreenplayTypeId, ScreenplayTypeConfig> = {
  'film': {
    id: 'film',
    name: 'Film',
    description: 'Feature or short film screenplay',
    dbType: 'FILM',
    gradient: 'from-amber-500/10 to-yellow-500/10',
    gradientSelected: 'from-amber-500 to-yellow-600',
    color: 'amber',
    iconName: 'Film',
    accentColor: 'amber',
  },
  'tv-series': {
    id: 'tv-series',
    name: 'Series',
    description: 'Episode with series structure',
    dbType: 'TV',
    gradient: 'from-blue-500/10 to-sky-500/10',
    gradientSelected: 'from-blue-500 to-sky-600',
    color: 'blue',
    iconName: 'Tv',
    accentColor: 'blue',
  },
  'blank': {
    id: 'blank',
    name: 'Blank',
    description: 'Start fresh with no template',
    dbType: 'FILM',
    gradient: 'from-gray-500/10 to-slate-500/10',
    gradientSelected: 'from-gray-500 to-slate-600',
    color: 'gray',
    iconName: 'FileText',
    accentColor: 'gray',
  },
};

// Helper to get config from database type
export function getTypeConfigFromDbType(dbType: DatabaseScreenplayType): ScreenplayTypeConfig {
  if (dbType === 'TV') return screenplayTypes['tv-series'];
  return screenplayTypes['film'];
}

// Genre options for feature films
export const genreOptions = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Documentary',
  'Animation',
  'Fantasy',
  'Mystery',
  'Western',
] as const;

export type Genre = typeof genreOptions[number];

// TV format options
export const tvFormatOptions: { id: TVFormat; label: string; description: string }[] = [
  { id: 'drama', label: 'Drama', description: '45-60 min episodes' },
  { id: 'sitcom', label: 'Sitcom', description: '22-30 min episodes' },
  { id: 'pilot', label: 'Pilot', description: 'Series premiere' },
];

// Form data structure for screenplay creation
export interface ScreenplayFormData {
  type: ScreenplayTypeId;
  title: string;
  logline?: string;
  genre?: string;
  // Author/co-writer names (free-form text)
  author?: string;
  // TV-specific
  seriesTitle?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  tvFormat?: TVFormat;
}

// Default content templates - minimal structure for all types
export const templateContent: Record<ScreenplayTypeId, string> = {
  'film': `INT. LOCATION - DAY

Action description.

                         CHARACTER NAME
         Dialogue.
`,

  'tv-series': `INT. LOCATION - DAY

Action description.

                         CHARACTER NAME
         Dialogue.
`,

  'blank': `INT. LOCATION - DAY

Action description.

                         CHARACTER NAME
         Dialogue.
`,
};

// Legacy Template type (kept for backwards compatibility)
export type TemplateType = 'feature' | 'tv-sitcom' | 'tv-drama' | 'pilot' | 'blank';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  content: string;
  metadata: {
    format: string;
    pageCount?: number;
    actStructure?: string;
    features?: string[];
  };
  thumbnail?: string;
}

// Legacy template mapping (maps old types to new content)
export const screenplayTemplates: Record<TemplateType, Template> = {
  'feature': {
    id: 'feature',
    name: 'Feature Film',
    description: 'Standard three-act feature film screenplay format',
    type: 'feature',
    metadata: {
      format: 'Feature Film',
      pageCount: 90,
      actStructure: '3-Act',
      features: ['Title page', 'Three-act structure', 'Scene headings'],
    },
    content: templateContent['film'],
  },
  'tv-sitcom': {
    id: 'tv-sitcom',
    name: 'TV Sitcom',
    description: 'Multi-camera sitcom format',
    type: 'tv-sitcom',
    metadata: {
      format: 'TV Sitcom',
      pageCount: 35,
      actStructure: '2-Act + Tag',
      features: ['Act breaks', 'Scene numbers'],
    },
    content: templateContent['tv-series'],
  },
  'tv-drama': {
    id: 'tv-drama',
    name: 'TV Drama',
    description: 'One-hour drama format',
    type: 'tv-drama',
    metadata: {
      format: 'TV Drama',
      pageCount: 55,
      actStructure: '4-5 Act',
      features: ['Act breaks', 'TEASER'],
    },
    content: templateContent['tv-series'],
  },
  'pilot': {
    id: 'pilot',
    name: 'TV Pilot',
    description: 'Television pilot episode',
    type: 'pilot',
    metadata: {
      format: 'TV Pilot',
      pageCount: 60,
      actStructure: 'TEASER + 4-5 Acts',
      features: ['World building', 'Character introductions'],
    },
    content: templateContent['tv-series'],
  },
  'blank': {
    id: 'blank',
    name: 'Blank Screenplay',
    description: 'Start from scratch',
    type: 'blank',
    metadata: {
      format: 'Standard',
      features: ['Maximum flexibility'],
    },
    content: templateContent['blank'],
  },
};
