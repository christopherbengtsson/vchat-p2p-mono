import { DatabaseService } from '@mono/common-supabase';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { ClientAuthService } from '@mono/fe-supabase';
import { SupabaseClient } from '@/common/supabase/client';
import { DeviceSignatureUtil } from '../../../common/utils/DeviceSignatureUtil';
import { axiosClient } from '../../../common/clients/axios';

const client = SupabaseClient.instance;

async function loginAnonymously() {
  const { data } = await axiosClient.post<{
    fingerprint: string;
  }>('/signature', { deviceSignature: DeviceSignatureUtil.get() });

  const { data: isBlacklisted } = await DatabaseService.isBlacklisted(
    SupabaseClient.instance,
    data.fingerprint,
  );

  if (isBlacklisted) {
    throw new CustomError(CustomErrorType.UNAUTHORIZED, 'User is banned');
  }

  await ClientAuthService.loginAnonymously(client);
}

async function loginWithEmail(email: string, password: string) {
  await ClientAuthService.loginWithEmail(email, password, client);
}

export const AuthService = {
  loginAnonymously,
  loginWithEmail,
};
