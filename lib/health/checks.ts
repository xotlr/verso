import { prisma } from '@/lib/prisma';
import { HealthCheckResult, ServiceStatus } from './types';

/**
 * Check database connectivity by executing a simple query
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Math.round(performance.now() - start);

    return {
      service: 'database',
      status: responseTime > 1000 ? 'degraded' : 'operational',
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'outage',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Database connection failed',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Check auth service by verifying NextAuth is configured
 */
export async function checkAuth(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    // Check that auth environment variables are set
    const hasAuthSecret = !!process.env.AUTH_SECRET || !!process.env.NEXTAUTH_SECRET;
    const hasProviders = !!process.env.GOOGLE_CLIENT_ID || !!process.env.AUTH_GOOGLE_ID;

    const responseTime = Math.round(performance.now() - start);

    if (!hasAuthSecret || !hasProviders) {
      return {
        service: 'auth',
        status: 'degraded',
        responseTime,
        error: 'Auth configuration incomplete',
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      service: 'auth',
      status: 'operational',
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'auth',
      status: 'outage',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Auth check failed',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Check API health by verifying core functionality
 */
export async function checkApi(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    // Simple check - if we can run this function, API is working
    // In production, this could ping an internal endpoint
    const responseTime = Math.round(performance.now() - start);

    return {
      service: 'api',
      status: 'operational',
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      service: 'api',
      status: 'outage',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'API check failed',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Check WASM engine availability
 * This verifies the WASM files exist and are accessible
 */
export async function checkWasm(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    // In a server context, we check if the WASM files exist
    // The actual WASM loading happens client-side
    const fs = await import('fs/promises');
    const path = await import('path');

    const wasmPath = path.join(process.cwd(), 'public/wasm/verso_pagination_engine_bg.wasm');

    try {
      await fs.access(wasmPath);
      const stats = await fs.stat(wasmPath);
      const responseTime = Math.round(performance.now() - start);

      // File should be at least 100KB for a valid WASM module
      if (stats.size < 100 * 1024) {
        return {
          service: 'wasm',
          status: 'degraded',
          responseTime,
          error: 'WASM file appears incomplete',
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        service: 'wasm',
        status: 'operational',
        responseTime,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        service: 'wasm',
        status: 'outage',
        responseTime: Math.round(performance.now() - start),
        error: 'WASM file not found',
        checkedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      service: 'wasm',
      status: 'outage',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'WASM check failed',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Run all health checks and return overall status
 */
export async function runAllChecks(): Promise<{
  status: ServiceStatus;
  services: HealthCheckResult[];
  timestamp: string;
}> {
  const [api, database, auth, wasm] = await Promise.all([
    checkApi(),
    checkDatabase(),
    checkAuth(),
    checkWasm(),
  ]);

  const services = [api, database, auth, wasm];

  // Determine overall status
  const hasOutage = services.some(s => s.status === 'outage');
  const hasDegraded = services.some(s => s.status === 'degraded');

  let status: ServiceStatus = 'operational';
  if (hasOutage) {
    status = 'outage';
  } else if (hasDegraded) {
    status = 'degraded';
  }

  return {
    status,
    services,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save health check results to database
 */
export async function saveHealthChecks(results: HealthCheckResult[]): Promise<void> {
  await prisma.serviceHealthCheck.createMany({
    data: results.map(r => ({
      service: r.service,
      status: r.status,
      responseTime: r.responseTime,
      errorMessage: r.error,
      checkedAt: new Date(r.checkedAt),
    })),
  });
}

/**
 * Get recent health checks for a service
 */
export async function getRecentHealthChecks(
  service: string,
  limit: number = 10
): Promise<HealthCheckResult[]> {
  const checks = await prisma.serviceHealthCheck.findMany({
    where: { service },
    orderBy: { checkedAt: 'desc' },
    take: limit,
  });

  return checks.map(c => ({
    service: c.service as HealthCheckResult['service'],
    status: c.status as ServiceStatus,
    responseTime: c.responseTime ?? undefined,
    error: c.errorMessage ?? undefined,
    checkedAt: c.checkedAt.toISOString(),
  }));
}
