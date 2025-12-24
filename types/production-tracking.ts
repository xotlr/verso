// Production tracking types for on-set shot management

export type ShotStatus = "planned" | "setup" | "shot" | "approved"

export interface ShotProgress {
  total: number
  planned: number
  setup: number
  shot: number
  approved: number
  percentComplete: number
}

export interface SceneProgress {
  sceneId: string
  sceneNumber: number
  heading: string
  shotProgress: ShotProgress
  isComplete: boolean
}

export interface ProductionProgress {
  totalShots: number
  completedShots: number // shot + approved
  approvedShots: number
  percentComplete: number
  scenes: SceneProgress[]
}

export interface QuickShotUpdate {
  shotId: string
  status: ShotStatus
  takeCount?: number
  circledTake?: number
  quickNotes?: string
}

// Status display configuration (no colors, only symbols)
export const SHOT_STATUS_CONFIG = {
  planned: {
    symbol: "○",
    label: "Planned",
    weight: "normal" as const,
    opacity: "text-muted-foreground",
  },
  setup: {
    symbol: "◐",
    label: "Setup",
    weight: "medium" as const,
    opacity: "text-muted-foreground",
  },
  shot: {
    symbol: "●",
    label: "Shot",
    weight: "medium" as const,
    opacity: "text-foreground",
  },
  approved: {
    symbol: "✓",
    label: "Approved",
    weight: "semibold" as const,
    opacity: "text-foreground",
  },
} as const

// Status progression order
export const STATUS_ORDER: ShotStatus[] = ["planned", "setup", "shot", "approved"]

export function getNextStatus(current: ShotStatus): ShotStatus {
  const currentIndex = STATUS_ORDER.indexOf(current)
  if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) {
    return current
  }
  return STATUS_ORDER[currentIndex + 1]
}

export function getPreviousStatus(current: ShotStatus): ShotStatus {
  const currentIndex = STATUS_ORDER.indexOf(current)
  if (currentIndex <= 0) {
    return current
  }
  return STATUS_ORDER[currentIndex - 1]
}

export function isCompletedStatus(status: ShotStatus): boolean {
  return status === "shot" || status === "approved"
}
