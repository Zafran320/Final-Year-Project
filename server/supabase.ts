import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { ENV } from "./_core/env";

let _supabaseAdmin: SupabaseClient | null = null;
let _supabaseClient: SupabaseClient | null = null;

// Node 20 has no global WebSocket, and supabase-js refuses to construct a client
// without one. Passing `ws` keeps the server working on Node 20 and 22+.
const realtimeOptions = { transport: WebSocket as unknown as typeof globalThis.WebSocket };

const resilientFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const timeoutSignal = AbortSignal.timeout(6000);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;

      return await fetch(input, { ...init, signal });
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return fetch(input, init);
};

/**
 * Checks if the backend has full Supabase admin (service_role) credentials configured.
 */
export function hasSupabaseAdminRole(): boolean {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey);
}

/**
 * Returns an admin Supabase client initialized with the Service Role Key.
 * Useful for server-side elevated database, user administration, or storage operations.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!_supabaseAdmin && ENV.supabaseUrl && (ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey)) {
    try {
      _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: resilientFetch,
        },
        realtime: realtimeOptions,
      });
    } catch (error) {
      console.warn("[Supabase] Failed to initialize Supabase admin client:", error);
      _supabaseAdmin = null;
    }
  }
  return _supabaseAdmin;
}

/**
 * Returns a standard Supabase client initialized with the Anon Key.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!_supabaseClient && ENV.supabaseUrl && ENV.supabaseAnonKey) {
    try {
      _supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
        global: {
          fetch: resilientFetch,
        },
        realtime: realtimeOptions,
      });
    } catch (error) {
      console.warn("[Supabase] Failed to initialize Supabase public client:", error);
      _supabaseClient = null;
    }
  }
  return _supabaseClient;
}

export { createClient };
