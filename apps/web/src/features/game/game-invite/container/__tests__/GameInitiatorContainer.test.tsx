import { InviteData } from '@mono/common-dto';
import { render, screen, act } from '@testing-library/react';
import { GameInitiatorContainer } from '../GameInitiatorContainer';
import { GameInviteService } from '../../service/GameInviteService';

vi.mock('../../service/GameInviteService', () => ({
  GameInviteService: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('../../../game-engine/container/GameEngineContainer', () => ({
  GameEngineContainer: () => <div data-testid="game-engine" />,
}));

describe('GameInitiatorContainer', () => {
  const userId = 'user-123';
  let listenerCallback: (data: InviteData) => void;

  beforeEach(() => {
    vi.resetAllMocks();

    (GameInviteService.addListener as any).mockImplementation(
      (callback: (inviteData: InviteData) => void) => {
        listenerCallback = callback;
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render GameEngineContainer when gameActive is false', () => {
    render(
      <GameInitiatorContainer
        userId={userId}
        gameActive={false}
        setGameActive={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('game-engine')).not.toBeInTheDocument();
    expect(GameInviteService.addListener).toHaveBeenCalled();
  });

  it('should handle PLAYER_READY invite message and activate game when two players are ready', () => {
    const setGameActive = vi.fn();

    render(
      <GameInitiatorContainer
        userId={userId}
        gameActive={false}
        setGameActive={setGameActive}
      />,
    );

    const mockInviteData: InviteData = {
      type: 'PLAYER_READY',
      playerId: 'player-456',
      initiator: true,
    };

    act(() => {
      listenerCallback(mockInviteData);
    });

    expect(setGameActive).toHaveBeenCalledWith(true);
  });

  it('should set initiator to the opposite of the received value', () => {
    const setGameActive = vi.fn();

    const { rerender } = render(
      <GameInitiatorContainer
        userId={userId}
        gameActive={false}
        setGameActive={setGameActive}
      />,
    );

    act(() => {
      listenerCallback({
        type: 'PLAYER_READY',
        playerId: 'player-456',
        initiator: true,
      });
    });

    rerender(
      <GameInitiatorContainer
        userId={userId}
        gameActive={true}
        setGameActive={setGameActive}
      />,
    );

    expect(screen.getByTestId('game-engine')).toBeInTheDocument();
  });

  it('should ignore non-PLAYER_READY messages', () => {
    const setGameActive = vi.fn();

    render(
      <GameInitiatorContainer
        userId={userId}
        gameActive={false}
        setGameActive={setGameActive}
      />,
    );

    act(() => {
      listenerCallback({
        type: 'SOME_OTHER_TYPE' as any,
        playerId: 'player-456',
        initiator: true,
      });
    });

    expect(setGameActive).not.toHaveBeenCalled();
  });

  it('should remove the listener when unmounted', () => {
    const setGameActive = vi.fn();

    const { unmount } = render(
      <GameInitiatorContainer
        userId={userId}
        gameActive={false}
        setGameActive={setGameActive}
      />,
    );

    expect(GameInviteService.addListener).toHaveBeenCalled();

    unmount();

    expect(GameInviteService.removeListener).toHaveBeenCalled();
    expect(GameInviteService.removeListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
