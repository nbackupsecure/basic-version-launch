import { createClient } from '@supabase/supabase-js';

// Direct constants fallback as requested:
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "మీ_SUPABASE_PROJECT_URL";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "మీ_SUPABASE_ANON_KEY";

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  isValidUrl(SUPABASE_URL) &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('placeholder')
);

export const supabase = createClient(
  isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY
);
