import { DatabaseService } from '@mono/common-supabase';
import { useMutation } from '@tanstack/react-query';
import { BanDuration } from '@mono/common-dto';
import { SupabaseClient } from '@/common/clients/supabase';

const client = SupabaseClient.instance;

export const useReportUser = () => {
  const reportUserMutation = useMutation<
    BanDuration,
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
