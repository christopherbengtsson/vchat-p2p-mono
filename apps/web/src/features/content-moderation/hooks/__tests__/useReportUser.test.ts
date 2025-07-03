import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { NavigateFunction } from 'react-router';
import { DatabaseService } from '@mono/common-supabase';
import { BanDuration, Maybe } from '@mono/common-dto';
import { VChatSocket } from '@mono/fe-dto';
import { TestWithQueryContext } from '@/testUtils';
import { useReportUser } from '../useReportUser';
import { InCallService } from '../../../call/in-call/service/InCallService';

vi.mock('../../../call/in-call/service/InCallService', () => ({
  InCallService: {
    endCall: vi.fn(),
  },
}));

describe('useReportUser', () => {
  const mockProps = {
    maybeSocketId: 'socket-123' as Maybe<string>,
    socket: {
      emit: vi.fn(),
    } as unknown as Maybe<VChatSocket>,
    roomId: 'room-123',
    reporterUserId: 'reporter-123',
    partnerUserId: 'partner-123',
    partnerSocketId: 'partner-socket-123',
    navigate: vi.fn() as unknown as NavigateFunction,
    doOnSettled: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report user without ban', async () => {
    vi.spyOn(DatabaseService, 'reportUser').mockResolvedValue(
      BanDuration.NO_BAN,
    );

    const { result } = renderHook(() => useReportUser(mockProps), {
      wrapper: TestWithQueryContext,
    });

    result.current.onReportClick();

    // Check if the report API was called with correct parameters
    await waitFor(() => {
      expect(DatabaseService.reportUser).toHaveBeenCalledWith(
        expect.anything(), // client
        mockProps.reporterUserId,
        mockProps.partnerUserId,
      );
    });

    // Verify socket emits user-reported event
    await waitFor(() => {
      expect(mockProps.socket?.emit).toHaveBeenCalledWith(
        'user-reported',
        mockProps.partnerSocketId,
        mockProps.partnerUserId,
        mockProps.reporterUserId,
      );
    });

    // Verify call end
    await waitFor(() => {
      expect(InCallService.endCall).toHaveBeenCalledWith(
        mockProps.socket,
        mockProps.roomId,
        mockProps.maybeSocketId,
        mockProps.navigate,
      );
    });

    // Verify callback was called
    await waitFor(() => {
      expect(mockProps.doOnSettled).toHaveBeenCalled();
    });
  });

  it('should report user with ban', async () => {
    vi.spyOn(DatabaseService, 'reportUser').mockResolvedValue(
      BanDuration.TIER_1,
    );

    const { result } = renderHook(() => useReportUser(mockProps), {
      wrapper: TestWithQueryContext,
    });

    result.current.onReportClick();

    // Check if the report API was called with correct parameters
    await waitFor(() => {
      expect(DatabaseService.reportUser).toHaveBeenCalledWith(
        expect.anything(), // client
        mockProps.reporterUserId,
        mockProps.partnerUserId,
      );
    });

    // Verify socket emits ban-user event
    await waitFor(() => {
      expect(mockProps.socket?.emit).toHaveBeenCalledWith('ban-user', {
        partnerSocketId: mockProps.partnerSocketId,
        partnerUserId: mockProps.partnerUserId,
        banDuration: BanDuration.TIER_1,
      });
    });

    // Verify callback was called
    await waitFor(() => {
      expect(mockProps.doOnSettled).toHaveBeenCalled();
    });

    // Verify that endCall wasn't called (since the call ends automatically when user is banned)
    expect(InCallService.endCall).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const error = new Error('Failed to report user');
    vi.spyOn(DatabaseService, 'reportUser').mockRejectedValue(error);

    const { result } = renderHook(() => useReportUser(mockProps), {
      wrapper: TestWithQueryContext,
    });

    result.current.onReportClick();

    // Check if error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    consoleErrorSpy.mockRestore();
  });
});
