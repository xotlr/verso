// Shotlist types for production planning

export const SHOT_TYPES = [
  // Wide shots
  'EXTREME_WIDE',
  'WIDE',
  'ESTABLISHING',
  'AERIAL',
  // Medium shots
  'FULL',
  'MEDIUM_WIDE',
  'MEDIUM',
  'MEDIUM_CLOSE',
  // Close shots
  'CLOSE_UP',
  'EXTREME_CLOSE',
  'EXTREME_CLOSE_UP',
  'INSERT',
  // Multi-person shots
  'TWO_SHOT',
  'THREE_SHOT',
  'GROUP_SHOT',
  // Special shots
  'OVER_SHOULDER',
  'POV',
  'ANGLE_ON',
  'TRACKING',
  'MOVING',
  // Angle-based shots
  'LOW_ANGLE',
  'HIGH_ANGLE',
  'DUTCH_ANGLE',
] as const;

export const CAMERA_ANGLES = [
  'EYE_LEVEL',
  'HIGH_ANGLE',
  'LOW_ANGLE',
  'DUTCH',
  'BIRDS_EYE',
  'WORMS_EYE',
  'OVER_SHOULDER',
  'POV',
] as const;

export const CAMERA_MOVEMENTS = [
  'STATIC',
  'HANDHELD',
  'PAN',
  'TILT',
  'DOLLY',
  'STEADICAM',
  'ZOOM',
  'TRUCK',
  'CRANE',
  'RACK_FOCUS',
] as const;

export const SHOT_STATUSES = ['planned', 'setup', 'shot', 'approved'] as const;

export type ShotType = typeof SHOT_TYPES[number];
export type CameraAngle = typeof CAMERA_ANGLES[number];
export type CameraMovement = typeof CAMERA_MOVEMENTS[number];
export type ShotStatus = typeof SHOT_STATUSES[number];

export interface Shot {
  id: string;
  screenplayId: string;
  sceneId: string;
  shotNumber: number;
  description: string;
  shotType: ShotType | null;
  cameraAngle: CameraAngle | null;
  movement: CameraMovement | null;
  duration: number | null;
  lens: string | null;
  equipment: string | null;
  lighting: string | null;
  audio: string | null;
  notes: string | null;
  thumbnailUrl: string | null;
  thumbnailType: 'upload' | 'url' | null;
  status: ShotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SceneWithShots {
  sceneId: string;
  sceneHeading: string;
  sceneNumber: number;
  shots: Shot[];
}

// Label mappings for display
export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  // Wide shots
  EXTREME_WIDE: 'Extreme Wide',
  WIDE: 'Wide',
  ESTABLISHING: 'Establishing',
  AERIAL: 'Aerial',
  // Medium shots
  FULL: 'Full Shot',
  MEDIUM_WIDE: 'Medium Wide',
  MEDIUM: 'Medium',
  MEDIUM_CLOSE: 'Medium Close-Up',
  // Close shots
  CLOSE_UP: 'Close-Up',
  EXTREME_CLOSE: 'Extreme Close-Up',
  EXTREME_CLOSE_UP: 'Extreme Close-Up',
  INSERT: 'Insert',
  // Multi-person shots
  TWO_SHOT: 'Two-Shot',
  THREE_SHOT: 'Three-Shot',
  GROUP_SHOT: 'Group Shot',
  // Special shots
  OVER_SHOULDER: 'Over-the-Shoulder',
  POV: 'POV',
  ANGLE_ON: 'Angle On',
  TRACKING: 'Tracking',
  MOVING: 'Moving',
  // Angle-based shots
  LOW_ANGLE: 'Low Angle',
  HIGH_ANGLE: 'High Angle',
  DUTCH_ANGLE: 'Dutch Angle',
};

export const SHOT_TYPE_ABBREVIATIONS: Record<ShotType, string> = {
  // Wide shots
  EXTREME_WIDE: 'EWS',
  WIDE: 'WS',
  ESTABLISHING: 'EST',
  AERIAL: 'AER',
  // Medium shots
  FULL: 'FS',
  MEDIUM_WIDE: 'MWS',
  MEDIUM: 'MS',
  MEDIUM_CLOSE: 'MCU',
  // Close shots
  CLOSE_UP: 'CU',
  EXTREME_CLOSE: 'ECU',
  EXTREME_CLOSE_UP: 'ECU',
  INSERT: 'INS',
  // Multi-person shots
  TWO_SHOT: '2S',
  THREE_SHOT: '3S',
  GROUP_SHOT: 'GRP',
  // Special shots
  OVER_SHOULDER: 'OTS',
  POV: 'POV',
  ANGLE_ON: 'ANG',
  TRACKING: 'TRK',
  MOVING: 'MOV',
  // Angle-based shots
  LOW_ANGLE: 'LA',
  HIGH_ANGLE: 'HA',
  DUTCH_ANGLE: 'DA',
};

export const SHOT_TYPE_COLORS: Record<ShotType, string> = {
  // Wide shots - blue tones
  EXTREME_WIDE: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  WIDE: 'bg-blue-400/20 text-blue-600 dark:text-blue-300',
  ESTABLISHING: 'bg-blue-600/20 text-blue-700 dark:text-blue-300',
  AERIAL: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  // Medium shots - green tones
  FULL: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  MEDIUM_WIDE: 'bg-green-400/20 text-green-700 dark:text-green-300',
  MEDIUM: 'bg-green-500/20 text-green-700 dark:text-green-300',
  MEDIUM_CLOSE: 'bg-teal-500/20 text-teal-700 dark:text-teal-300',
  // Close shots - orange/red tones
  CLOSE_UP: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  EXTREME_CLOSE: 'bg-red-500/20 text-red-700 dark:text-red-300',
  EXTREME_CLOSE_UP: 'bg-red-500/20 text-red-700 dark:text-red-300',
  INSERT: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  // Multi-person shots - purple tones
  TWO_SHOT: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  THREE_SHOT: 'bg-violet-500/20 text-violet-700 dark:text-violet-300',
  GROUP_SHOT: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300',
  // Special shots - pink/rose tones
  OVER_SHOULDER: 'bg-pink-500/20 text-pink-700 dark:text-pink-300',
  POV: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  ANGLE_ON: 'bg-pink-400/20 text-pink-700 dark:text-pink-300',
  TRACKING: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  MOVING: 'bg-indigo-400/20 text-indigo-700 dark:text-indigo-300',
  // Angle-based shots - slate/gray tones
  LOW_ANGLE: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  HIGH_ANGLE: 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-300',
  DUTCH_ANGLE: 'bg-stone-500/20 text-stone-700 dark:text-stone-300',
};

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  EYE_LEVEL: 'Eye Level',
  HIGH_ANGLE: 'High Angle',
  LOW_ANGLE: 'Low Angle',
  DUTCH: 'Dutch Angle',
  BIRDS_EYE: "Bird's Eye",
  WORMS_EYE: "Worm's Eye",
  OVER_SHOULDER: 'Over the Shoulder',
  POV: 'Point of View',
};

export const CAMERA_ANGLE_DESCRIPTIONS: Record<CameraAngle, string> = {
  EYE_LEVEL: 'Neutral, natural perspective at subject eye height',
  HIGH_ANGLE: 'Camera above subject (15-45°), makes subject appear smaller',
  LOW_ANGLE: 'Camera below subject, makes subject appear powerful',
  DUTCH: 'Camera tilted on axis, creates tension or disorientation',
  BIRDS_EYE: 'Directly overhead (90°), aerial/godlike perspective',
  WORMS_EYE: 'Ground level looking up, extreme low angle',
  OVER_SHOULDER: 'Behind one subject looking at another',
  POV: 'First person perspective, what character sees',
};

export const CAMERA_MOVEMENT_LABELS: Record<CameraMovement, string> = {
  STATIC: 'Static',
  PAN: 'Pan',
  TILT: 'Tilt',
  DOLLY: 'Dolly',
  TRUCK: 'Truck',
  CRANE: 'Crane',
  HANDHELD: 'Handheld',
  STEADICAM: 'Steadicam',
  ZOOM: 'Zoom',
  RACK_FOCUS: 'Rack Focus',
};

export const SHOT_STATUS_LABELS: Record<ShotStatus, string> = {
  planned: 'Planned',
  setup: 'Setting Up',
  shot: 'Shot',
  approved: 'Approved',
};

export const SHOT_STATUS_COLORS: Record<ShotStatus, string> = {
  planned: 'bg-gray-500/10 text-gray-600 border border-gray-500/20 dark:text-gray-400',
  setup: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 dark:text-yellow-400',
  shot: 'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400',
  approved: 'bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400',
};

// Common lens presets
export const COMMON_LENSES = [
  '14mm',
  '24mm',
  '35mm',
  '50mm',
  '85mm',
  '100mm',
  '135mm',
  '200mm',
] as const;

/**
 * A shot detected from screenplay text (not yet saved to DB).
 * These are suggestions that can be added to the shotlist.
 */
export interface DetectedShot {
  id: string; // Temporary ID based on position
  sceneId: string | null;
  shotType: string; // From DetectedShotType in screenplay-patterns.ts
  subject: string | null;
  lineContent: string; // The full line of text
  position: number; // Position in document
  lineNumber: number; // Approximate line number for display
}

/**
 * A marker linking a document position to a shot.
 * Used for inline shot markers in the editor.
 */
export interface ShotMarker {
  id: string;           // Unique marker ID
  shotId: string;       // Reference to the Shot in the database
  position: number;     // Document position
  sceneId: string;      // Scene this marker belongs to
}
