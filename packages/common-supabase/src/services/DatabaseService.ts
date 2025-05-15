import { type SupabaseClient } from '@supabase/supabase-js';
import {
  BanReason,
  CustomError,
  Database,
  isBanDuration,
  Maybe,
  Userprofile,
} from '@mono/common-dto';
import { QueryService } from './QueryService.js';

async function getUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Maybe<Userprofile>> {
  const { data } = await QueryService.getSingleUserQueryById(client, userId);

  return data;
}

async function reportUser(
  client: SupabaseClient<Database>,
  reporterId: string,
  toReportId: string,
  reason: BanReason = 'INAPPROPRIATE_BEHAVIOR',
) {
  const { data } = await client
    .rpc('report_user', {
      p_reporter_id: reporterId,
      p_user_id_to_report: toReportId,
      p_reason: reason,
    })
    .throwOnError();

  if (isBanDuration(data)) {
    return data;
  }

  throw CustomError.badState(`Invalid ban duration value: ${data}`);
}

async function blacklistFingerprint(
  client: SupabaseClient<Database>,
  fingerprint: string,
) {
  return await client.from('blacklist').upsert({ fingerprint });
}

async function isBlacklisted(
  client: SupabaseClient<Database>,
  fingerprint: string,
) {
  return await client
    .from('blacklist')
    .select()
    .eq('fingerprint', fingerprint)
    .maybeSingle();
}

export const DatabaseService = {
  getUser,
  reportUser,
  blacklistFingerprint,
  isBlacklisted,
};
