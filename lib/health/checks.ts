import { createServiceRoleClient } from '@/lib/supabase/server';
import { HealthCheckResult, ServiceStatus } from './types';

/**
 * Check database connectivity by executing a simple query
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    const supabase = createServiceRoleClient();
    // Simple query to verify connection
    const { error } = await supabase.from('User').select('id').limit(1);

    if (error) throw error;

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
 * Check auth service by verifying Supabase Auth is configured
 */
export async function checkAuth(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    // Check that Supabase environment variables are set
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const responseTime = Math.round(performance.now() - start);

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      return {
        service: 'auth',
        status: 'degraded',
        responseTime,
        error: 'Supabase configuration incomplete',
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
  const supabase = createServiceRoleClient();
  await (supabase.from('ServiceHealthCheck') as ReturnType<typeof supabase.from>).insert(
    results.map(r => ({
      service: r.service,
      status: r.status,
      responseTime: r.responseTime,
      errorMessage: r.error,
      checkedAt: new Date(r.checkedAt).toISOString(),
    }))
  );
}

/**
 * Get recent health checks for a service
 */
interface HealthCheckRow {
  service: string;
  status: string;
  responseTime: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export async function getRecentHealthChecks(
  service: string,
  limit: number = 10
): Promise<HealthCheckResult[]> {
  const supabase = createServiceRoleClient();
  const result = await supabase
    .from('ServiceHealthCheck')
    .select('*')
    .eq('service', service)
    .order('checkedAt', { ascending: false })
    .limit(limit);
  const checks = (result.data || []) as HealthCheckRow[];

  return checks.map(c => ({
    service: c.service as HealthCheckResult['service'],
    status: c.status as ServiceStatus,
    responseTime: c.responseTime ?? undefined,
    error: c.errorMessage ?? undefined,
    checkedAt: c.checkedAt,
  }));
}
