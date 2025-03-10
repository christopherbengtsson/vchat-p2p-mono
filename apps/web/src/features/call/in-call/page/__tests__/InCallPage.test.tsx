import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { RoutePath } from '@/RoutePath';
import { CallRouterStateLocation, InCallPage } from '../InCallPage';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

// Mock CallContainer to simplify testing
vi.mock('../../container/CallContainer', () => ({
  CallContainer: ({
    routerState,
  }: {
    routerState: CallRouterStateLocation;
  }) => (
    <div
      data-testid="call-container"
      data-state={JSON.stringify(routerState)}
    ></div>
  ),
}));

describe('InCallPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it('should navigate away when roomId is missing', () => {
    (useParams as any).mockReturnValue({ roomId: null });
    (useLocation as any).mockReturnValue({
      state: {
        partnerSocketId: 'socket123',
        partnerUserId: 'user123',
        isPolite: true,
      },
    });

    render(<InCallPage />);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      state: null,
      replace: true,
    });
  });

  it('should navigate away when state is missing', () => {
    (useParams as any).mockReturnValue({ roomId: 'room123' });
    (useLocation as any).mockReturnValue({ state: null });

    render(<InCallPage />);

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      state: null,
      replace: true,
    });
  });

  it('should render call container when both roomId and state are valid', () => {
    const mockRoomId = 'room123';
    const mockState = {
      partnerSocketId: 'socket123',
      partnerUserId: 'user123',
      isPolite: true,
    };

    (useParams as any).mockReturnValue({ roomId: mockRoomId });
    (useLocation as any).mockReturnValue({ state: mockState });

    render(<InCallPage />);

    const callContainer = screen.getByTestId('call-container');
    expect(callContainer).toBeInTheDocument();

    const passedProps = JSON.parse(
      callContainer.getAttribute('data-state') || '{}',
    );
    expect(passedProps).toEqual({ ...mockState, roomId: mockRoomId });
  });

  it('should not render anything when state is invalid', () => {
    (useParams as any).mockReturnValue({ roomId: null });
    (useLocation as any).mockReturnValue({ state: null });

    const { container } = render(<InCallPage />);

    expect(container.firstChild).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      state: null,
      replace: true,
    });
  });
});
