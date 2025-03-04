import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { RootStore } from '@/stores/RootStore';
import * as useRootStore from '@/stores/hooks/useRootStore';
import * as showToastModule from '@/common/utils/toast/showToast';
import { ErrorToastState } from '@/common/utils/toast/model/ToastState';
import { RoutePath } from '@/RoutePath';
import { FindMatchContainer } from '../FindMatchContainer';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actualRouter = await vi.importActual('react-router-dom');
  return { ...actualRouter, useNavigate: () => mockNavigate };
});

describe('FindMatchContainer', () => {
  const mockMediaStore = {
    getMediaPermissions: vi.fn(),
    requestAudioAndVideoStream: vi.fn(),
    stream: null,
    videoEnabled: true,
    audioEnabled: true,
  };

  const mockSocketStore = {
    connected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useRootStore, 'useRootStore').mockReturnValue({
      socketStore: mockSocketStore,
      mediaStore: mockMediaStore,
    } as unknown as RootStore);

    mockMediaStore.getMediaPermissions.mockResolvedValue(true);
    mockMediaStore.requestAudioAndVideoStream.mockResolvedValue(undefined);
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
    } as unknown as RootStore);

    render(<FindMatchContainer />);
    expect(
      screen.getByRole('button', { name: 'Connecting...' }),
    ).toBeDisabled();
  });

  it('should navigate to call page when permissions are granted', async () => {
    const user = userEvent.setup();
    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(mockMediaStore.getMediaPermissions).toHaveBeenCalled();
      expect(mockMediaStore.requestAudioAndVideoStream).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(RoutePath.CALL, {
        state: {
          findMatch: true,
        },
      });
    });
  });

  it('should open permissions dialog when permissions are not granted', async () => {
    const user = userEvent.setup();
    mockMediaStore.getMediaPermissions.mockResolvedValueOnce(false);

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(mockMediaStore.getMediaPermissions).toHaveBeenCalled();
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
    mockMediaStore.getMediaPermissions.mockResolvedValueOnce(false);

    render(<FindMatchContainer />);

    await user.click(screen.getByRole('button', { name: 'Find match' }));

    await waitFor(() => {
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockMediaStore.requestAudioAndVideoStream).toHaveBeenCalled();
    });
  });

  it('should show loading state in dialog when waiting for permissions', async () => {
    const user = userEvent.setup();
    mockMediaStore.getMediaPermissions.mockResolvedValueOnce(false);
    // Make the requestAudioAndVideoStream function delay to show loading state
    mockMediaStore.requestAudioAndVideoStream.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
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
        expect(mockMediaStore.requestAudioAndVideoStream).toHaveBeenCalled();
      },
      { timeout: 200 },
    );
  });

  it('should show toast when media request returns an error', async () => {
    const user = userEvent.setup();
    const showToastSpy = vi.spyOn(showToastModule, 'showToast');
    mockMediaStore.requestAudioAndVideoStream.mockResolvedValueOnce(
      ErrorToastState.MEDIA_STREAM_NOT_ALLOWED,
    );

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
    mockMediaStore.getMediaPermissions.mockResolvedValueOnce(false);
    mockMediaStore.requestAudioAndVideoStream.mockResolvedValueOnce(
      ErrorToastState.MEDIA_STREAM_NOT_AVAILABLE,
    );

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
});
