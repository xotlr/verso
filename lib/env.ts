import { z } from 'zod';

/**
 * Environment variable validation schema.
 * Validates all required environment variables at runtime.
 *
 * Usage: Import this module in app/layout.tsx to validate on startup.
 */
const envSchema = z.object({
  // Database (required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // NextAuth (required)
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),
  NEXTAUTH_URL: z.string().url().optional(), // Optional in production (uses VERCEL_URL)
  AUTH_TRUST_HOST: z.string().optional(),

  // Google OAuth (required for social login)
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  // Stripe (required for payments)
  STRIPE_SECRET_KEY: z.string().refine(
    (val) => val.startsWith('sk_test_') || val.startsWith('sk_live_'),
    'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_'
  ),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().refine(
    (val) => val.startsWith('whsec_'),
    'STRIPE_WEBHOOK_SECRET must start with whsec_'
  ),

  // Stripe Price IDs (optional - only needed if using subscriptions)
  NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID: z.string().optional(),

  // Email (optional - for invites and notifications)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Upstash Redis (optional - falls back to in-memory rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Anthropic AI (optional - for AI features)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Development flags
  NEXT_PUBLIC_USE_LVH_ME: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((e) => `  - ${e.path.join('.')}: ${e.message}`);
      console.error('\n❌ Invalid environment variables:\n' + missing.join('\n') + '\n');

      // In development, throw to halt startup
      // In production, log but continue (some vars may be optional)
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Invalid environment variables. See console for details.');
      }
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type export for autocomplete
export type Env = z.infer<typeof envSchema>;
