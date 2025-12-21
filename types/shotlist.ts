// Shotlist types for production planning

export const SHOT_TYPES = [
  'EXTREME_WIDE',
  'WIDE',
  'FULL',
  'MEDIUM_WIDE',
  'MEDIUM',
  'MEDIUM_CLOSE',
  'CLOSE_UP',
  'EXTREME_CLOSE',
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
  'PAN',
  'TILT',
  'DOLLY',
  'TRUCK',
  'CRANE',
  'HANDHELD',
  'STEADICAM',
  'ZOOM',
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
  EXTREME_WIDE: 'Extreme Wide',
  WIDE: 'Wide',
  FULL: 'Full Shot',
  MEDIUM_WIDE: 'Medium Wide',
  MEDIUM: 'Medium',
  MEDIUM_CLOSE: 'Medium Close-Up',
  CLOSE_UP: 'Close-Up',
  EXTREME_CLOSE: 'Extreme Close-Up',
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
