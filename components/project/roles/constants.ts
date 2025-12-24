import {
  User,
  Clapperboard,
  PenTool,
  Music,
  Palette,
  Megaphone,
  Scissors,
  Camera,
  Headphones,
  Users,
} from 'lucide-react'
import type { RoleDefinition } from './types'

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  // Creative
  { value: 'director', label: 'Director', icon: Clapperboard },
  { value: 'writer', label: 'Writer', icon: PenTool },
  { value: 'producer', label: 'Producer', icon: Megaphone },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone },
  // Camera
  { value: 'dop', label: 'DOP', icon: Camera },
  { value: 'camera_operator', label: 'Camera Op', icon: Camera },
  { value: 'first_ac', label: '1st AC', icon: Camera },
  // Post
  { value: 'editor', label: 'Editor', icon: Scissors },
  { value: 'colorist', label: 'Colorist', icon: Palette },
  { value: 'vfx_supervisor', label: 'VFX Supervisor', icon: Palette },
  // Sound
  { value: 'composer', label: 'Composer', icon: Music },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones },
  // Art/Design
  { value: 'production_designer', label: 'Production Designer', icon: Palette },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette },
  { value: 'makeup_artist', label: 'Makeup Artist', icon: User },
  // Production
  { value: 'line_producer', label: 'Line Producer', icon: User },
  { value: 'upm', label: 'UPM', icon: User },
  { value: 'first_ad', label: '1st AD', icon: User },
  { value: 'second_ad', label: '2nd AD', icon: User },
  { value: 'script_supervisor', label: 'Script Supervisor', icon: PenTool },
  // Grip/Electric
  { value: 'gaffer', label: 'Gaffer', icon: User },
  { value: 'key_grip', label: 'Key Grip', icon: User },
  // Talent
  { value: 'casting_director', label: 'Casting Director', icon: Users },
  { value: 'stunt_coordinator', label: 'Stunt Coordinator', icon: User },
]

// Legacy role value mappings (old -> new)
const LEGACY_ROLE_MAP: Record<string, string> = {
  cinematographer: 'dop',
}

export function normalizeRoleValue(roleValue: string): string {
  return LEGACY_ROLE_MAP[roleValue] || roleValue
}

export function getRoleLabel(roleValue: string): string {
  const normalized = normalizeRoleValue(roleValue)
  const def = ROLE_DEFINITIONS.find((r) => r.value === normalized)
  return def?.label || roleValue
}

export function getRoleIcon(roleValue: string) {
  const normalized = normalizeRoleValue(roleValue)
  const def = ROLE_DEFINITIONS.find((r) => r.value === normalized)
  return def?.icon || User
}

export function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}
