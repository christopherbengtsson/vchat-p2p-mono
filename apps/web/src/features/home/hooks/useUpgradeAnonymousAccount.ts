import type { AuthError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { ClientAuthService } from '@mono/common-supabase';
import { SupabaseClient } from '@/common/supabase/client';

const client = SupabaseClient.instance;

export const useUpgradeAnonymousAccount = () => {
  const upgradeAnonymousAccountMutation = useMutation<
    unknown,
    AuthError,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      ClientAuthService.upgradeAnonymousAccount(email, password, client),
    onError: (error) => {
      console.error(error); // TODO: handle error
    },
  });

  return upgradeAnonymousAccountMutation;
};
