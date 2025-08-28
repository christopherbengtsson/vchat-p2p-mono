import { render } from '@testing-library/react';
import { RoutePath } from '@/RoutePath';
import { NewMatchContainer } from '../NewMatchContainer';
import { CONNECTION_TIMEOUT_MS } from '../../hooks/useConnectionTimeout';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actualRouter = await vi.importActual('react-router');
  return { ...actualRouter, useNavigate: () => mockNavigate };
});

describe('NewMatchContainer', () => {
  const mockPartnerSocketId = 'partner-socket-id-123';

  const renderTestee = () =>
    render(<NewMatchContainer partnerSocketId={mockPartnerSocketId} />);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should navigate when connection times out', () => {
    renderTestee();
    vi.advanceTimersByTime(CONNECTION_TIMEOUT_MS - 2000);
    expect(mockNavigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalled();

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.CALL, {
      state: {
        findMatch: true,
      },
      replace: true,
    });
  });
});
