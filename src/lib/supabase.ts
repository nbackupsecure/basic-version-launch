import { createClient } from '@supabase/supabase-js';

// Clean trimmed Supabase credentials (strictly ASCII, no ISO-8859-1 header errors)
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://qtwpkukfmdcfepywmrsz.supabase.co").trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_W_evFyxldpcmJFL-L-SKQg_VpQ-8Ts2").trim();

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
