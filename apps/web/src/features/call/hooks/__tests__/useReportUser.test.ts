import { renderHook, waitFor } from '@testing-library/react';
import { DatabaseService } from '@mono/common-supabase';
import { useReportUser } from '../useReportUser';
import { TestWithQueryContext } from '../../../../testUtils';

describe('useReportUser', () => {
  it('works', async () => {
    const mockDuration = 24;
    vi.spyOn(DatabaseService, 'reportUser').mockResolvedValue({
      data: mockDuration,
    } as any);

    const { result } = renderHook(() => useReportUser(), {
      wrapper: TestWithQueryContext,
    });

    result.current.mutate({
      reporterId: 'reporterId',
      toReportId: 'toReportId',
    });

    await waitFor(() => expect(result.current.data?.data).toBe(24));
  });
});
