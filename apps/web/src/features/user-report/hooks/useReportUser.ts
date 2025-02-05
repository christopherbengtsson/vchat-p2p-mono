import { DatabaseService } from '@mono/common-supabase';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { SupabaseClient } from '@/common/clients/supabase';

const client = SupabaseClient.instance;

export const useReportUser = () => {
  const reportUserMutation = useMutation<
    PostgrestSingleResponse<number>,
    unknown,
    { reporterId: string; toReportId: string }
  >({
    mutationFn: ({ reporterId, toReportId }) =>
      DatabaseService.reportUser(client, reporterId, toReportId),
    onError: (error) => {
      console.error(error); // TODO: handle error
    },
  });

  return reportUserMutation;
};
