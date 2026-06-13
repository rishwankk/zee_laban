import { createClient } from '@supabase/supabase-js';
import { supabaseAPI } from './supabaseAPI';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Unified API Client for the Multi-Store Laban Billing & POS System.
 * Strictly uses Supabase. LocalStorage fallback has been removed per user request.
 */
export const api = isSupabaseConfigured 
  ? supabaseAPI 
  : new Proxy({} as typeof supabaseAPI, {
      get: () => {
        throw new Error("Supabase is not configured. Please check your .env.local file.");
      }
    });

// Re-export all database interfaces and schemas for unified types resolution
export * from './db';

