// Profile types for the glanceable crew profile system

// ============================================================================
// Availability Status
// ============================================================================

export const AVAILABILITY_CONFIG = {
  AVAILABLE: {
    label: 'Available',
    shortLabel: 'Available',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500',
    description: 'Open for work',
  },
  BUSY: {
    label: 'Busy',
    shortLabel: 'Busy',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    description: 'Limited availability',
  },
  NOT_LOOKING: {
    label: 'Not looking',
    shortLabel: 'Not looking',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500',
    description: 'Not seeking work',
  },
} as const;

export type Availability = keyof typeof AVAILABILITY_CONFIG;

// ============================================================================
// Response Rate
// ============================================================================

export const RESPONSE_RATE_CONFIG = {
  UNKNOWN: {
    label: '',
    description: '',
  },
  WITHIN_HOURS: {
    label: 'Very responsive',
    description: 'Usually responds within hours',
  },
  WITHIN_DAY: {
    label: 'Responsive',
    description: 'Usually responds within 24 hours',
  },
  WITHIN_WEEK: {
    label: 'Responds weekly',
    description: 'Usually responds within a week',
  },
  SLOW: {
    label: 'May be slow',
    description: 'May take a while to respond',
  },
} as const;

export type ResponseRate = keyof typeof RESPONSE_RATE_CONFIG;

// ============================================================================
// Profile Roles (predefined crew positions)
// ============================================================================

export const PROFILE_ROLES = [
  { value: 'writer', label: 'Writer' },
  { value: 'director', label: 'Director' },
  { value: 'producer', label: 'Producer' },
  { value: 'cinematographer', label: 'DP' },
  { value: 'editor', label: 'Editor' },
  { value: 'actor', label: 'Actor' },
  { value: 'composer', label: 'Composer' },
  { value: 'sound_designer', label: 'Sound Designer' },
  { value: 'production_designer', label: 'Production Designer' },
  { value: 'vfx_artist', label: 'VFX Artist' },
  { value: 'colorist', label: 'Colorist' },
  { value: 'gaffer', label: 'Gaffer' },
  { value: 'grip', label: 'Grip' },
  { value: 'costume_designer', label: 'Costume Designer' },
  { value: 'makeup_artist', label: 'Makeup Artist' },
  { value: 'stunt_coordinator', label: 'Stunt Coordinator' },
] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number]['value'];

export function getRoleLabel(value: string): string {
  const role = PROFILE_ROLES.find((r) => r.value === value);
  return role?.label ?? value;
}

// ============================================================================
// Languages
// ============================================================================

export const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Mandarin',
  'Cantonese',
  'Hindi',
  'Arabic',
  'Hebrew',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Polish',
  'Turkish',
  'Greek',
  'Czech',
  'Hungarian',
  'Romanian',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Tagalog',
] as const;

// ============================================================================
// Credit Interface
// ============================================================================

export interface Credit {
  id: string;
  title: string;
  role: string;
  year: number;
  projectId: string | null;
  isManual: boolean;
  displayOrder: number;
}

// ============================================================================
// Verified Badges
// ============================================================================

export interface VerifiedBadges {
  email: boolean;
  imdb: boolean;
  shippedProject: boolean; // Has completed at least one project
}

// ============================================================================
// Featured Project
// ============================================================================

export interface FeaturedProject {
  id: string;
  name: string;
  coverImage: string | null;
  description: string | null;
}

// ============================================================================
// Full Profile Type
// ============================================================================

export interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  banner: string | null;

  // The Core
  oneLiner: string | null;
  location: string | null;
  roles: string[];
  reelUrl: string | null;
  availability: Availability;

  // The Work
  featuredProject: FeaturedProject | null;
  credits: Credit[];
  showcaseTimelapse: string | null;

  // Trust Layer
  verifiedBadges: VerifiedBadges;
  responseRate: ResponseRate;
  projectsCompleted: number;

  // The Vibe
  influences: string[];
  lookingFor: string | null;
  gear: string | null;
  languages: string[];

  // Social
  website: string | null;
  twitter: string | null;
  linkedin: string | null;
  imdb: string | null;

  // Meta
  isPublic: boolean;
  createdAt: string;
  plan: string;

  // Counts
  _count: {
    projects: number;
    screenplays: number;
  };
}

// ============================================================================
// Profile Edit Form Data
// ============================================================================

export interface ProfileFormData {
  name: string;
  username: string;
  image: string | null;
  banner: string | null;

  // Core
  oneLiner: string;
  location: string;
  roles: string[];
  reelUrl: string;
  availability: Availability;

  // Work
  featuredProjectId: string | null;
  showcaseTimelapse: string | null;

  // Vibe
  influences: string[];
  lookingFor: string;
  gear: string;
  languages: string[];

  // Links
  website: string;
  twitter: string;
  linkedin: string;
  imdb: string;

  // Privacy
  isPublic: boolean;
}
