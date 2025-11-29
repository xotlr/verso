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
  planned: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  setup: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  shot: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
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
