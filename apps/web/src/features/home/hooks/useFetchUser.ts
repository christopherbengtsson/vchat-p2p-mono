import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data: user, isPending } = useQuery({
    queryKey: [userId],
    queryFn: () => fetchFunction(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });

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
  };
};
