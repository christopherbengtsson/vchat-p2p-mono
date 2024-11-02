import { useMutation } from '@tanstack/react-query';
import type { AuthError } from '@supabase/supabase-js';
import { ClientAuthService } from '@mono/common-supabase';
import { SupabaseClient } from '@/features/supabase/client';

const client = SupabaseClient.instance;

export const useLogins = () => {
  const loginWithEmailMutation = useMutation<
    unknown,
    AuthError,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      ClientAuthService.loginWithEmail(email, password, client),
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  const loginAnonymouslyMutation = useMutation<unknown, AuthError>({
    mutationFn: () => ClientAuthService.loginAnonymously(client),
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  return {
    loginWithEmailMutation,
    loginAnonymouslyMutation,
  };
};
