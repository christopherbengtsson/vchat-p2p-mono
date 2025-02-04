import { Database } from '@mono/common-dto';
import { SupabaseClient } from '@supabase/supabase-js';

const getSingleUserQueryById = async (
  client: SupabaseClient<Database>,
  userId: string,
) => client.from('profiles').select('*').eq('id', userId).maybeSingle();

const getSingleUserQueryByEmail = async (
  client: SupabaseClient<Database>,
  email: string,
) => client.from('profiles').select().eq('email', email).maybeSingle();

export const QueryService = {
  getSingleUserQueryById,
  getSingleUserQueryByEmail,
};
