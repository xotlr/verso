// Simplified template types for screenplay creation wizard

export type ScreenplayTypeId = 'feature' | 'tv-series' | 'short' | 'stage' | 'blank';

// Maps to Prisma's ScreenplayType enum
export type DatabaseScreenplayType = 'FEATURE' | 'TV' | 'SHORT';

export type TVFormat = 'drama' | 'sitcom' | 'pilot';

export interface ScreenplayTypeConfig {
  id: ScreenplayTypeId;
  name: string;
  description: string;
  dbType: DatabaseScreenplayType;
  gradient: string;
  gradientSelected: string;
  color: string;
  iconName: 'Film' | 'Tv' | 'Sparkles' | 'Theater' | 'FileText';
}

export const screenplayTypes: Record<ScreenplayTypeId, ScreenplayTypeConfig> = {
  'feature': {
    id: 'feature',
    name: 'Feature Film',
    description: 'Full-length theatrical screenplay (90-120 pages)',
    dbType: 'FEATURE',
    gradient: 'from-violet-500/10 to-purple-500/10',
    gradientSelected: 'from-violet-500 to-purple-600',
    color: 'violet',
    iconName: 'Film',
  },
  'tv-series': {
    id: 'tv-series',
    name: 'TV Series',
    description: 'Television episode with series structure',
    dbType: 'TV',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    gradientSelected: 'from-blue-500 to-cyan-600',
    color: 'blue',
    iconName: 'Tv',
  },
  'short': {
    id: 'short',
    name: 'Short Film',
    description: 'Short-form film (5-30 pages)',
    dbType: 'SHORT',
    gradient: 'from-amber-500/10 to-orange-500/10',
    gradientSelected: 'from-amber-500 to-orange-600',
    color: 'amber',
    iconName: 'Sparkles',
  },
  'stage': {
    id: 'stage',
    name: 'Stage Play',
    description: 'Traditional theatrical format',
    dbType: 'FEATURE', // Stage plays use FEATURE as fallback
    gradient: 'from-rose-500/10 to-pink-500/10',
    gradientSelected: 'from-rose-500 to-pink-600',
    color: 'rose',
    iconName: 'Theater',
  },
  'blank': {
    id: 'blank',
    name: 'Blank',
    description: 'Start fresh with no template',
    dbType: 'FEATURE',
    gradient: 'from-gray-500/10 to-slate-500/10',
    gradientSelected: 'from-gray-500 to-slate-600',
    color: 'gray',
    iconName: 'FileText',
  },
};

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
  // TV-specific
  seriesTitle?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  tvFormat?: TVFormat;
  // Short-specific
  targetRuntime?: number;
}

// Default content templates
export const templateContent: Record<ScreenplayTypeId, string> = {
  'feature': `FADE IN:

INT. LOCATION - DAY

Action description. This is where you describe what's happening on screen. Keep it concise and visual.

                         CHARACTER NAME
         Dialogue goes here. Keep it natural and
         character-driven.

EXT. ANOTHER LOCATION - NIGHT

More action.

FADE OUT.

                                    THE END
`,

  'tv-series': `                              "EPISODE TITLE"

                            Episode #101

                                      by

                                  Writer Name


                                   TEASER

FADE IN:

INT. LOCATION - DAY

Opening hook to grab the audience.

                         CHARACTER NAME
         Dialogue.

                                                      FADE OUT.

                             END OF TEASER


                                  ACT ONE

FADE IN:

INT. LOCATION - DAY

Story begins.

                         CHARACTER NAME
         Dialogue.

                                                      FADE OUT.

                              END OF ACT ONE


                                  ACT TWO

FADE IN:

INT. LOCATION - LATER

Story develops.

                                                      FADE OUT.

                              END OF ACT TWO


                                    END
`,

  'short': `FADE IN:

INT. LOCATION - DAY

Action description. Short films require economy - every line matters.

                         CHARACTER NAME
         Dialogue should be minimal and impactful.

EXT. LOCATION - LATER

Visual storytelling is especially important in shorts.

FADE OUT.

                                  THE END
`,

  'stage': `                              PLAY TITLE

                                      by

                                  Playwright Name


                            CHARACTERS
                            (in order of appearance)

CHARACTER ONE - Brief description
CHARACTER TWO - Brief description


                            TIME AND PLACE

Time: Present day
Place: Location description


                                  ACT ONE

                                 SCENE 1

                    (Setting description)

                    (AT RISE: What's happening as curtain opens)

CHARACTER ONE
         (stage direction)
Dialogue begins here.

CHARACTER TWO
         (entering)
Response dialogue.

                                                      (CURTAIN)

                             END OF ACT ONE


                                    END
`,

  'blank': `FADE IN:

INT. LOCATION - DAY



FADE OUT.
`,
};

// Keep old Template type for backwards compatibility during migration
export type TemplateType = 'feature' | 'tv-sitcom' | 'tv-drama' | 'pilot' | 'stage' | 'short' | 'blank';

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

// Legacy template mapping for existing code
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
    content: templateContent['feature'],
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
  'stage': {
    id: 'stage',
    name: 'Stage Play',
    description: 'Traditional stage play format',
    type: 'stage',
    metadata: {
      format: 'Stage Play',
      actStructure: '1-3 Act',
      features: ['Scene descriptions', 'Stage directions'],
    },
    content: templateContent['stage'],
  },
  'short': {
    id: 'short',
    name: 'Short Film',
    description: 'Short film format (5-30 minutes)',
    type: 'short',
    metadata: {
      format: 'Short Film',
      pageCount: 15,
      actStructure: 'Simple 3-Act',
      features: ['Concise storytelling'],
    },
    content: templateContent['short'],
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
