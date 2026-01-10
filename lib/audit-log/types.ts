/**
 * Audit log types and constants - safe for client-side imports
 */

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
