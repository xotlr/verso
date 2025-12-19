import { NextResponse } from 'next/server';
import { runAllChecks, saveHealthChecks } from '@/lib/health';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/health
 * Cron job endpoint for background health monitoring.
 * Runs every 5 minutes via Vercel Cron.
 *
 * This endpoint:
 * 1. Runs health checks on all services
 * 2. Saves results to ServiceHealthCheck table
 * 3. Updates daily UptimeRecord aggregations
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if CRON_SECRET is not set
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Run health checks
    const health = await runAllChecks();

    // Save to database
    await saveHealthChecks(health.services);

    // Update daily uptime records
    await updateDailyUptime();

    return NextResponse.json({
      success: true,
      timestamp: health.timestamp,
      status: health.status,
      services: health.services.map((s) => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime,
      })),
    });
  } catch (error) {
    console.error('[Cron Health] Error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

/**
 * Update daily uptime records based on health checks
 */
async function updateDailyUptime() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const services = ['api', 'database', 'auth', 'wasm'];

  for (const service of services) {
    // Get all checks for today
    const checks = await prisma.serviceHealthCheck.findMany({
      where: {
        service,
        checkedAt: { gte: today },
      },
    });

    if (checks.length === 0) continue;

    // Calculate uptime percentage
    const operationalChecks = checks.filter(
      (c) => c.status === 'operational'
    ).length;
    const uptimePercent = (operationalChecks / checks.length) * 100;

    // Calculate downtime minutes (rough estimate based on 5-min intervals)
    const outageChecks = checks.filter((c) => c.status === 'outage').length;
    const downtimeMinutes = outageChecks * 5;

    // Upsert the record
    await prisma.uptimeRecord.upsert({
      where: {
        service_date: {
          service,
          date: today,
        },
      },
      create: {
        service,
        date: today,
        uptimePercent,
        downtimeMinutes,
      },
      update: {
        uptimePercent,
        downtimeMinutes,
      },
    });
  }
}

// Configure route segment config for Vercel
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds timeout
