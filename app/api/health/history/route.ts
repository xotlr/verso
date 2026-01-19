import { createApiHandler } from '@/lib/api';
import { SERVICES, type ServiceName, type UptimeData } from '@/lib/health';

/**
 * GET /api/health/history
 * Returns 90-day uptime history for all services.
 * No authentication required.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ searchParams, supabase }) => {
    const days = parseInt(searchParams.get('days') || '90', 10);
    const limitedDays = Math.min(Math.max(days, 1), 365); // 1-365 days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitedDays);
    startDate.setHours(0, 0, 0, 0);

    // Fetch uptime records
    const { data: records, error } = await supabase
      .from('UptimeRecord')
      .select('*')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: false });

    if (error) throw error;

    // Group by service
    const history: Record<ServiceName, UptimeData[]> = {
      api: [],
      database: [],
      auth: [],
      wasm: [],
    };

    interface UptimeRecordResult {
      service: string
      date: string
      uptimePercent: number
      downtimeMinutes: number
    }
    ((records as UptimeRecordResult[]) || []).forEach((record) => {
      const service = record.service as ServiceName;
      if (SERVICES.includes(service)) {
        history[service].push({
          service,
          date: new Date(record.date).toISOString().split('T')[0],
          uptimePercent: record.uptimePercent,
          downtimeMinutes: record.downtimeMinutes,
        });
      }
    });

    // Calculate overall uptime percentages
    const overallUptime: Record<ServiceName, number> = {
      api: 100,
      database: 100,
      auth: 100,
      wasm: 100,
    };

    SERVICES.forEach((service) => {
      const serviceRecords = history[service];
      if (serviceRecords.length > 0) {
        const sum = serviceRecords.reduce((acc, r) => acc + r.uptimePercent, 0);
        overallUptime[service] = Math.round((sum / serviceRecords.length) * 100) / 100;
      }
    });

    return {
      history,
      overallUptime,
      days: limitedDays,
      startDate: startDate.toISOString(),
    };
  },
});
