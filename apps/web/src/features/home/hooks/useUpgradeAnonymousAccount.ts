import type { AuthError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientAuthService } from '@mono/fe-supabase';
import { SupabaseClient } from '@/common/clients/supabase';

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
      toast.error('Unable to upgrade account, please try again later');
    },
  });

  return upgradeAnonymousAccountMutation;
};
