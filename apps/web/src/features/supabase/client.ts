import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SupabaseClient = {
  instance: createClient(URL, ANON_KEY),
};

Object.freeze(SupabaseClient);

export { SupabaseClient };
