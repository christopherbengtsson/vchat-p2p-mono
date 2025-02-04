import { SupabaseClientWrapper } from '@mono/common-supabase';

const URL: string = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SupabaseClient = SupabaseClientWrapper.getInstance({
  url: URL,
  key: ANON_KEY,
});
