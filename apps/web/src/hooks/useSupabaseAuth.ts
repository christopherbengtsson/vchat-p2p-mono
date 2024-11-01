import { useMutation } from '@tanstack/react-query';
import type { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../services/AuthService';

export const useSupabaseAuth = () => {
  const loginWithEmailMutation = useMutation<
    unknown,
    AuthError,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      AuthService.loginWithEmail(email, password),
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  const loginAnonymouslyMutation = useMutation<unknown, AuthError>({
    mutationFn: AuthService.loginAnonymously,
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  const upgradeAnonymousAccountMutation = useMutation<
    unknown,
    AuthError,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      AuthService.upgradeAnonymousAccount(email, password),
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  const logoutMutation = useMutation<unknown, AuthError>({
    mutationFn: AuthService.logout,
    onError: (error) => {
      console.log(error); // TODO: handle error
    },
  });

  return {
    loginWithEmailMutation,
    loginAnonymouslyMutation,
    upgradeAnonymousAccountMutation,
    logoutMutation,
  };
};
