import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AuthError } from '@supabase/supabase-js';
import { CustomError } from '@mono/common-dto';
import { AuthService } from '../service/AuthService';

export const useLogins = () => {
  const loginWithEmailMutation = useMutation<
    unknown,
    AuthError | CustomError,
    { email: string; password: string }
  >({
    mutationFn: async ({ email, password }) =>
      AuthService.loginWithEmail(email, password),
    onError: (error) => {
      if (CustomError.isCustomError(error)) {
        toast.error(error.message);
      } else if (error.code === 'user_banned') {
        toast.error('User is banned, try again later');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong, try again later');
      }
    },
  });

  const loginAnonymouslyMutation = useMutation<
    unknown,
    AuthError | CustomError
  >({
    mutationFn: async () => AuthService.loginAnonymously(),
    onError: (error) => {
      if (CustomError.isCustomError(error)) {
        toast.error(error.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong, try again later');
      }
    },
  });

  return {
    loginWithEmailMutation,
    loginAnonymouslyMutation,
  };
};
