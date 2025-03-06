import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as useRootStore from '@/stores/hooks/useRootStore';
import { RootStore } from '@/stores/RootStore';
import { RoutePath } from '@/RoutePath';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { QueueContainer } from '../QueueContainer';

vi.mock('../../hooks/useOnMatchFound', () => ({
  useOnMatchFound: vi.fn(),
}));

vi.mock('../../hooks/useFindMatchOnMount', () => ({
  useFindMatchOnMount: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actualRouter = await vi.importActual('react-router-dom');
  return { ...actualRouter, useNavigate: () => mockNavigate };
});

describe('QueueContainer', () => {
  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  const mockAuthStore = {
    userId: 'user-123',
  };

  const mockMediaStore = {
    closeAudioAndVideoStream: vi.fn(),
  };

  const mockSocketStore = {
    socket: mockSocket,
    connected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useRootStore, 'useRootStore').mockReturnValue({
      socketStore: mockSocketStore,
      authStore: mockAuthStore,
      mediaStore: mockMediaStore,
    } as unknown as RootStore);

    vi.spyOn(RouterStateUtil, 'clear').mockImplementation(vi.fn());
  });

  it('should render the queue animation', () => {
    render(<QueueContainer />);

    expect(screen.getByText('Finding match...')).toBeInTheDocument();
  });

  it('should render the cancel button', () => {
    render(<QueueContainer />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should handle cancel match when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<QueueContainer />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockSocket.emit).toHaveBeenCalledWith('cancel-match', 'user-123');
    expect(mockMediaStore.closeAudioAndVideoStream).toHaveBeenCalled();
    expect(RouterStateUtil.clear).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME);
  });
});
