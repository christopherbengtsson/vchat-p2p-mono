import type { MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { RootStore } from '@/stores/RootStore';
import * as useRootStore from '@/stores/hooks/useRootStore';
import * as showToastModule from '@/common/utils/toast/showToast';
import { ErrorToastState } from '@/common/utils/toast/model/ToastState';
import { RoutePath } from '@/RoutePath';
import { FindMatchService } from '../../service/FindMatchService';
import { FindMatchContainer } from '../FindMatchContainer';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actualRouter = await vi.importActual('react-router');
  return { ...actualRouter, useNavigate: () => mockNavigate };
});
vi.mock('../../service/FindMatchService', () => ({
  FindMatchService: {
    getMediaPermissions: vi.fn().mockResolvedValue(true),
    requestAudioAndVideoStream: vi.fn().mockResolvedValue({
      stream: undefined,
      errorState: undefined,
    }),
  },
}));

describe('FindMatchContainer', () => {
  const mockMediaStore = {
    stream: null,
    videoEnabled: true,
    audioEnabled: true,
    setLocalStream: vi.fn(),
  };

  const mockSocketStore = {
    connected: true,
  };

  const mockContentModerationStore = {
    modelStatus: 'ready',
  };

  let getMediaPermissionsSpy: MockInstance;
  let requestAudioAndVideoStreamSpy: MockInstance;

  beforeEach(() => {
    vi.spyOn(useRootStore, 'useRootStore').mockReturnValue({
      socketStore: mockSocketStore,
      mediaStore: mockMediaStore,
      contentModerationStore: mockContentModerationStore,
    } as unknown as RootStore);

    getMediaPermissionsSpy = vi
      .spyOn(FindMatchService, 'getMediaPermissions')
      .mockResolvedValue(true);

    requestAudioAndVideoStreamSpy = vi
      .spyOn(FindMatchService, 'requestAudioAndVideoStream')
      .mockResolvedValue({
        stream: { active: true } as MediaStream,
        errorState: undefined,
      });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render enabled button when connected', async () => {
    render(<FindMatchContainer />);
    expect(screen.getByRole('button', { name: 'Find match' })).toBeEnabled();
  });

  it('should render disabled button when not connected', async () => {
    vi.spyOn(useRootStore, 'useRootStore').mockReturnValueOnce({
      socketStore: {
        connected: false,
      },
      mediaStore: mockMediaStore,
      contentModerationStore: mockContentModerationStore,
    } as unknown as RootStore);

    render(<FindMatchContainer />);
    expect(
      screen.getByRole('button', { name: 'Connecting...' }),
    ).toBeDisabled();
  });

  it('should render loading state when model is not ready', async () => {
    const user = userEvent.setup();

    const useRootStoreSpy = vi.spyOn(useRootStore, 'useRootStore');

    useRootStoreSpy.mockReturnValue({
      socketStore: mockSocketStore,
      mediaStore: mockMediaStore,
      contentModerationStore: {
        modelStatus: 'loading',
      },
    } as unknown as RootStore);

    render(<FindMatchContainer />);

    expect(
      screen.getByRole('button', { name: 'Find match' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Loading...' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
  });

  it('should navigate to call page when permissions are granted', async () => {
    const user = userEvent.setup();
    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    expect(getMediaPermissionsSpy).toHaveBeenCalled();
    expect(requestAudioAndVideoStreamSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.CALL, {
      state: {
        findMatch: true,
      },
    });
  });

  it('should open permissions dialog when permissions are not granted', async () => {
    const user = userEvent.setup();
    getMediaPermissionsSpy.mockResolvedValueOnce(false);

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(getMediaPermissionsSpy).toHaveBeenCalled();
    });

    expect(screen.getByText("Let's get started")).toBeInTheDocument();
    expect(
      screen.getByText('We need the following permissions'),
    ).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Microphone')).toBeInTheDocument();
  });

  it('should request media permissions when dialog button is clicked', async () => {
    const user = userEvent.setup();
    getMediaPermissionsSpy.mockResolvedValueOnce(false);

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(requestAudioAndVideoStreamSpy).toHaveBeenCalled();
    });
  });

  it('should show loading state in dialog when waiting for permissions', async () => {
    const user = userEvent.setup();
    getMediaPermissionsSpy.mockResolvedValueOnce(false);
    // Make the requestAudioAndVideoStream function delay to show loading state
    requestAudioAndVideoStreamSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ stream: {} as MediaStream, errorState: undefined }),
            100,
          ),
        ),
    );

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Waiting for permissions...')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(requestAudioAndVideoStreamSpy).toHaveBeenCalled();
      },
      { timeout: 200 },
    );
  });

  it('should show toast when media request returns an error', async () => {
    const user = userEvent.setup();
    const showToastSpy = vi.spyOn(showToastModule, 'showToast');
    requestAudioAndVideoStreamSpy.mockResolvedValueOnce({
      stream: undefined,
      errorState: ErrorToastState.MEDIA_STREAM_NOT_ALLOWED,
    });

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(showToastSpy).toHaveBeenCalledWith(
        ErrorToastState.MEDIA_STREAM_NOT_ALLOWED,
      );
    });
  });

  it('should show toast when requesting media from dialog returns an error', async () => {
    const user = userEvent.setup();
    const showToastSpy = vi.spyOn(showToastModule, 'showToast');
    getMediaPermissionsSpy.mockResolvedValueOnce(false);
    requestAudioAndVideoStreamSpy.mockResolvedValueOnce({
      stream: undefined,
      errorState: ErrorToastState.MEDIA_STREAM_NOT_AVAILABLE,
    });

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(showToastSpy).toHaveBeenCalledWith(
        ErrorToastState.MEDIA_STREAM_NOT_AVAILABLE,
      );
    });
  });

  it('should automatically navigate to call page after granting permissions from dialog', async () => {
    const user = userEvent.setup();

    getMediaPermissionsSpy.mockResolvedValueOnce(false);

    requestAudioAndVideoStreamSpy.mockResolvedValueOnce({
      stream: { active: true } as MediaStream,
      errorState: undefined,
    });

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(RoutePath.CALL, {
        state: {
          findMatch: true,
        },
      });
    });

    expect(requestAudioAndVideoStreamSpy).toHaveBeenCalled();
  });
});
