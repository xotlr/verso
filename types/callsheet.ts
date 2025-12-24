// Callsheet types for production features

export type CallsheetStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED';

// Scene to be shot
export interface CallsheetScene {
  id: string;
  sceneNumber: string;
  heading: string;
  description?: string;
  pageCount: number;
  eighths: number;
  estimatedDuration?: number;
  location?: string;
  cast: string[];
  notes?: string;
  status: 'pending' | 'in-progress' | 'completed';
  order: number;
}

// Cast member call time
export interface CastCall {
  id: string;
  characterName: string;
  actorName?: string;
  role: 'lead' | 'supporting' | 'day-player' | 'extra' | 'stunt';
  callTime: string;
  pickupTime?: string;
  pickupLocation?: string;
  makeupTime?: string;
  onSetTime?: string;
  scenes: string[];
  notes?: string;
  phone?: string;
  email?: string;
}

// Crew member/department
export interface CrewMember {
  id: string;
  name: string;
  role: string;
  department: CrewDepartment;
  callTime: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type CrewDepartment =
  | 'direction'
  | 'camera'
  | 'lighting'
  | 'grip'
  | 'sound'
  | 'art'
  | 'wardrobe'
  | 'makeup'
  | 'production'
  | 'locations'
  | 'transportation'
  | 'catering'
  | 'other';

// Location details
export interface CallsheetLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  type: 'primary' | 'secondary' | 'basecamp' | 'parking' | 'catering';
  mapUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactName?: string;
  contactPhone?: string;
  notes?: string;
  parkingInstructions?: string;
  nearestHospital?: string;
  nearestHospitalAddress?: string;
}

// Emergency contact
export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

// Catering/Meals info
export interface MealInfo {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'craft-services' | 'second-meal';
  time: string;
  location?: string;
  provider?: string;
  notes?: string;
}

// Special equipment or notes
export interface SpecialRequirement {
  id: string;
  category: 'equipment' | 'stunts' | 'fx' | 'animals' | 'minors' | 'other';
  description: string;
  responsible?: string;
  notes?: string;
}

// Weather information
export interface WeatherInfo {
  forecast: string;
  high: number;
  low: number;
  precipitation: number;
  humidity?: number;
  wind?: string;
  sunrise?: string;
  sunset?: string;
  notes?: string;
}

// The full callsheet data structure stored in JSON
export interface CallsheetData {
  productionTitle: string;
  productionCompany?: string;
  shootDay: number;
  totalShootDays?: number;

  generalCallTime: string;
  firstShotTime?: string;
  estimatedWrap?: string;

  scenes: CallsheetScene[];
  castCalls: CastCall[];
  crew: CrewMember[];
  locations: CallsheetLocation[];
  emergencyContacts: EmergencyContact[];

  nearestHospital?: {
    name: string;
    address: string;
    phone?: string;
  };
  safetyNotes?: string;

  meals: MealInfo[];
  specialRequirements: SpecialRequirement[];
  weather?: WeatherInfo;

  productionNotes?: string;
  parkingInfo?: string;
  shuttleInfo?: string;

  advanceSchedule?: {
    scenes: string[];
    location?: string;
    notes?: string;
  };
}

// API request/response types
export interface CallsheetCreateInput {
  title: string;
  shootDate: string;
  callTime: string;
  wrapTime?: string;
  status?: CallsheetStatus;
  primaryLocation?: string;
  data?: CallsheetData;
  weatherForecast?: string;
  weatherTemp?: number;
}

export interface CallsheetUpdateInput extends Partial<CallsheetCreateInput> {}

// Callsheet with relations (for API responses)
export interface CallsheetWithDetails {
  id: string;
  title: string;
  shootDate: string;
  callTime: string;
  wrapTime?: string | null;
  status: CallsheetStatus;
  primaryLocation?: string | null;
  data?: CallsheetData | null;
  weatherForecast?: string | null;
  weatherTemp?: number | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
}

// Card display data (for list view and editing)
export interface CallsheetCardData {
  id: string;
  title: string;
  shootDate: string;
  callTime: string;
  wrapTime?: string | null;
  status: CallsheetStatus;
  primaryLocation?: string | null;
  data?: CallsheetData | null;
  weatherForecast?: string | null;
  weatherTemp?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Export format options
export type CallsheetExportFormat = 'pdf' | 'html' | 'txt';

// Status display configuration
export const CALLSHEET_STATUS_CONFIG: Record<
  CallsheetStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/20',
  },
  PUBLISHED: {
    label: 'Published',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
  },
};

// Crew department labels
export const CREW_DEPARTMENT_LABELS: Record<CrewDepartment, string> = {
  direction: 'Direction',
  camera: 'Camera',
  lighting: 'Lighting',
  grip: 'Grip',
  sound: 'Sound',
  art: 'Art',
  wardrobe: 'Wardrobe',
  makeup: 'Makeup/Hair',
  production: 'Production',
  locations: 'Locations',
  transportation: 'Transportation',
  catering: 'Catering',
  other: 'Other',
};

// Meal type labels
export const MEAL_TYPE_LABELS: Record<MealInfo['type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  'craft-services': 'Craft Services',
  'second-meal': 'Second Meal',
};
