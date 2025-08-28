import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRootStore } from '../../../stores/hooks/useRootStore';
import { SupabaseClient } from '../../../common/clients/supabase';

const fetchFunction = async (userId: string) =>
  await SupabaseClient.instance
    .from('profiles')
    .select(
      `
      *,
      ignored_users!user_id (
        ignored_user_id,
        ignored_user:profiles!ignored_user_id (
          id,
          username,
          email,
          avatar_url
        )
      )
    `,
    )
    .eq('id', userId)
    .single()
    .throwOnError();

export const useFetchUser = () => {
  const { authStore } = useRootStore();
  const userId = authStore.userId;

  const {
    data: user,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: [userId],
    queryFn: () => fetchFunction(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (isError || !!user?.error) {
      toast.error('Failed to load user profile');
      console.error('Failed to load user profile', error ?? user.error);
    }
  }, [error, isError, user?.error]);

  const ignoredUserIds = useMemo(
    () => [
      ...(user?.data.ignored_users
        .map((user) => user.ignored_user_id)
        .filter((id) => id !== null) ?? []),
    ],
    [user?.data.ignored_users],
  );

  return {
    user: {
      ...user?.data,
      ignoredUserIds,
    },
    isPending,
    isError: isError || !!user?.error,
    error: error ?? user?.error,
  };
};
