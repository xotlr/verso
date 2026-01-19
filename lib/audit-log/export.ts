/**
 * Audit log export utilities
 * Supports CSV and JSON export formats with date range filtering
 */

import type { TeamAuditAction } from './types';
import { AUDIT_ACTION_LABELS } from './types';

export type ExportFormat = 'csv' | 'json';

export interface AuditLogEntry {
  id: string;
  action: TeamAuditAction;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  ipAddress: string | null;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface ExportOptions {
  format: ExportFormat;
  teamName: string;
  from?: Date;
  to?: Date;
}

/**
 * Format a single audit log entry for export
 */
function formatEntryForExport(entry: AuditLogEntry): Record<string, string> {
  return {
    timestamp: entry.createdAt,
    action: entry.action,
    action_label: AUDIT_ACTION_LABELS[entry.action] || entry.action,
    actor_id: entry.actor.id,
    actor_name: entry.actor.name || '',
    actor_email: entry.actor.email || '',
    target_type: entry.targetType || '',
    target_id: entry.targetId || '',
    ip_address: entry.ipAddress || '',
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : '',
  };
}

/**
 * Export audit logs to CSV format
 */
export function exportToCsv(entries: AuditLogEntry[], options: ExportOptions): string {
  if (entries.length === 0) {
    return 'timestamp,action,action_label,actor_id,actor_name,actor_email,target_type,target_id,ip_address,metadata\n';
  }

  const headers = [
    'timestamp',
    'action',
    'action_label',
    'actor_id',
    'actor_name',
    'actor_email',
    'target_type',
    'target_id',
    'ip_address',
    'metadata',
  ];

  const rows = entries.map((entry) => {
    const formatted = formatEntryForExport(entry);
    return headers
      .map((header) => {
        const value = formatted[header] || '';
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export audit logs to JSON format
 */
export function exportToJson(entries: AuditLogEntry[], options: ExportOptions): string {
  const exportData = {
    team: options.teamName,
    exportedAt: new Date().toISOString(),
    dateRange: {
      from: options.from?.toISOString() || null,
      to: options.to?.toISOString() || null,
    },
    totalEntries: entries.length,
    entries: entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt,
      action: entry.action,
      actionLabel: AUDIT_ACTION_LABELS[entry.action] || entry.action,
      actor: {
        id: entry.actor.id,
        name: entry.actor.name,
        email: entry.actor.email,
      },
      target: {
        type: entry.targetType,
        id: entry.targetId,
      },
      ipAddress: entry.ipAddress,
      metadata: entry.metadata,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Get content type for export format
 */
export function getContentType(format: ExportFormat): string {
  return format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8';
}

/**
 * Generate filename for export
 */
export function generateFilename(teamName: string, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  const safeName = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${safeName}-audit-log-${date}.${format}`;
}
