/**
 * Audit log export endpoint
 * GET /api/teams/[id]/audit-log/export?format=csv|json&from=ISO&to=ISO
 *
 * Exports team audit logs in CSV or JSON format.
 * Admin or owner access required.
 */

import { NextResponse } from 'next/server';
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from '@/lib/api';
import {
  exportToCsv,
  exportToJson,
  getContentType,
  generateFilename,
  type ExportFormat,
  type AuditLogEntry,
} from '@/lib/audit-log/export';

// Maximum entries to export (prevent memory issues)
const MAX_EXPORT_ENTRIES = 10000;

export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params;

    // Validate format parameter
    const formatParam = searchParams.get('format') || 'csv';
    if (formatParam !== 'csv' && formatParam !== 'json') {
      throw new BadRequestError('Invalid format. Use "csv" or "json".');
    }
    const format: ExportFormat = formatParam;

    // Parse date range
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromParam) {
      fromDate = new Date(fromParam);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestError('Invalid "from" date format. Use ISO 8601.');
      }
    }

    if (toParam) {
      toDate = new Date(toParam);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestError('Invalid "to" date format. Use ISO 8601.');
      }
    }

    // Check membership and get team
    const [membershipResult, teamResult] = await Promise.all([
      supabase
        .from('TeamMember')
        .select('role')
        .eq('teamId', id)
        .eq('userId', user.id)
        .single(),
      supabase
        .from('Team')
        .select('id, name, ownerId')
        .eq('id', id)
        .single(),
    ]);

    if (teamResult.error?.code === 'PGRST116' || !teamResult.data) {
      throw new NotFoundError('Team');
    }
    if (teamResult.error) handleSupabaseError(teamResult.error, 'Team');

    const team = teamResult.data;
    const membership = membershipResult.data;

    // Check admin/owner access
    const canExport =
      team.ownerId === user.id ||
      (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN'));

    if (!canExport) {
      throw new ForbiddenError('Only owners and admins can export audit logs');
    }

    // Build query
    let query = supabase
      .from('TeamAuditLog')
      .select(`
        id, action, targetType, targetId, metadata, createdAt, ipAddress,
        actor:User!actorId(id, name, email)
      `)
      .eq('teamId', id)
      .order('createdAt', { ascending: false })
      .limit(MAX_EXPORT_ENTRIES);

    // Apply date range filters
    if (fromDate) {
      query = query.gte('createdAt', fromDate.toISOString());
    }
    if (toDate) {
      query = query.lte('createdAt', toDate.toISOString());
    }

    const { data: auditLogs, error } = await query;
    if (error) handleSupabaseError(error, 'AuditLog');

    const entries = (auditLogs || []) as unknown as AuditLogEntry[];

    // Generate export
    const exportOptions = {
      format,
      teamName: team.name,
      from: fromDate,
      to: toDate,
    };

    const content = format === 'csv'
      ? exportToCsv(entries, exportOptions)
      : exportToJson(entries, exportOptions);

    const filename = generateFilename(team.name, format);

    // Return file response
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  },
});
