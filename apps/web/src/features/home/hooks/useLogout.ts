import { type AuthError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { ClientAuthService } from '@mono/common-supabase';
import { SupabaseClient } from '@/common/supabase/client';

const client = SupabaseClient.instance;

export const useLogout = () => {
  const logoutMutation = useMutation<unknown, AuthError>({
    mutationFn: () => ClientAuthService.logout(client),
    onError: (error) => {
      console.error(error); // TODO: handle error
    },
  });

  return logoutMutation;
};
