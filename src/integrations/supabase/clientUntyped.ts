/**
 * Supabase database helper for untyped queries.
 * Use these functions instead of supabase.from() directly to bypass type checking.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhuodcdbvtbrhovkyywp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodW9kY2RidnRicmhvdmt5eXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODAxOTAsImV4cCI6MjA4NDY1NjE5MH0.XfktuBGoyMjPpUxVQDCs5QtG8wDqn9N-XWsSTo7dSQU";

// Create base client
const baseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Get a table reference without type checking.
 * Use this instead of supabase.from() to avoid TypeScript errors.
 */
export function db(tableName: string): any {
  return (baseClient as any).from(tableName);
}

/**
 * Access storage buckets
 */
export const storage = baseClient.storage;

/**
 * Access Supabase functions
 */
export const functions = baseClient.functions;

/**
 * Access auth methods
 */
export const auth = baseClient.auth;

/**
 * The raw Supabase client (use with caution - may have type errors)
 */
export const supabaseUntyped = baseClient as any;
