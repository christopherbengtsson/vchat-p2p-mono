import { SupabaseClientWrapper } from '@mono/common-supabase';

const URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SupabaseClient = SupabaseClientWrapper.getInstance({
  url: URL,
  key: SERVICE_ROLE_KEY,
});
