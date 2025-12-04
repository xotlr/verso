/**
 * Supabase Client for Client-Side Operations
 * Used for real-time collaboration and other client-side features
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We use NextAuth for authentication
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Throttle events for performance
      },
    },
  });

  return supabaseClient;
}
