/**
 * Server-side audit logging functions
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

// Re-export types and constants for convenience
export {
  type TeamAuditAction,
  type AuditTargetType,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_ICONS,
} from "./types";

import type { TeamAuditAction, AuditTargetType } from "./types";

export interface LogTeamActionParams {
  teamId: string;
  actorId: string;
  action: TeamAuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log a team action for audit purposes.
 * This is fire-and-forget - errors are logged but don't throw.
 */
export async function logTeamAction(params: LogTeamActionParams): Promise<void> {
  const { teamId, actorId, action, targetType, targetId, metadata, ipAddress } = params;

  try {
    await prisma.teamAuditLog.create({
      data: {
        teamId,
        actorId,
        action,
        targetType,
        targetId,
        metadata: metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
        ipAddress,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging shouldn't break the main operation
    logger.error("Failed to create audit log", error instanceof Error ? error : undefined, {
      teamId,
      actorId,
      action,
    });
  }
}
