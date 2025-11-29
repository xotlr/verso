import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Team audit action types
export type TeamAuditAction =
  | "team_created"
  | "team_updated"
  | "team_deleted"
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "invite_sent"
  | "invite_revoked"
  | "invite_accepted"
  | "invite_declined"
  | "billing_updated"
  | "billing_canceled";

// Target types for audit logs
export type AuditTargetType = "member" | "invite" | "settings" | "billing";

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
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Human-readable labels for audit actions.
 */
export const AUDIT_ACTION_LABELS: Record<TeamAuditAction, string> = {
  team_created: "created the team",
  team_updated: "updated team settings",
  team_deleted: "deleted the team",
  member_added: "added a member",
  member_removed: "removed a member",
  member_role_changed: "changed a member's role",
  invite_sent: "sent an invitation",
  invite_revoked: "revoked an invitation",
  invite_accepted: "joined the team",
  invite_declined: "declined an invitation",
  billing_updated: "updated billing",
  billing_canceled: "canceled subscription",
};

/**
 * Get icon name for audit action (for UI).
 */
export const AUDIT_ACTION_ICONS: Record<TeamAuditAction, string> = {
  team_created: "Users",
  team_updated: "Settings",
  team_deleted: "Trash2",
  member_added: "UserPlus",
  member_removed: "UserMinus",
  member_role_changed: "Shield",
  invite_sent: "Mail",
  invite_revoked: "XCircle",
  invite_accepted: "CheckCircle",
  invite_declined: "XCircle",
  billing_updated: "CreditCard",
  billing_canceled: "XCircle",
};
