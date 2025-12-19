import { createApiHandler } from '@/lib/api';
import { runAllChecks } from '@/lib/health';

/**
 * GET /api/health
 * Public endpoint that returns current health status of all services.
 * No authentication required.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async () => {
    const health = await runAllChecks();
    return health;
  },
});
