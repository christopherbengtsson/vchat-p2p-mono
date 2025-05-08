import type { Mock } from 'vitest';
import { autorun, IReactionDisposer } from 'mobx';
import { Maybe, RoundData } from '@mono/common-dto';
import { renderHook, waitFor } from '@testing-library/react';
import { noop } from '@/common/utils/noop';
import { GameStore } from '@/features/game/game-engine/context/GameStore';
import { GameEngineService } from '../../service/GameEngineService';
import { useGameStore } from '../../context/useGameStore';
import { useGameEngine } from '../useGameEngine';
import { GameSpecificDispose } from '../../model/GameSpecificDispose';
import { GameState } from '../../model/GameState';

vi.mock('../../context/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../../service/GameEngineService', () => ({
  GameEngineService: {
    addGameRoundListener: vi.fn(),
    removeGameRoundListener: vi.fn(),
    notifyRoundStart: vi.fn(),
    notifyPlayerTurnComplete: vi.fn(),
    notifyTurnSwitch: vi.fn(),
    dispose: vi.fn(),
    playerTurnCleanup: vi.fn(),
  },
}));

describe('useGameEngine', () => {
  let gameStore: GameStore;
  let roundMessageCallback: ((data: RoundData) => void) | null = null;
  let reactionDisposer: Maybe<IReactionDisposer>;
  let mockPrepareGame: Mock;
  let mockGameDispose: Mock;
  let mockRoundDispose: Mock;

  const renderTestee = (stateTransitions?: GameState[], isMyTurn = true) => {
    gameStore = new GameStore('player1', isMyTurn);
    vi.mocked(useGameStore).mockReturnValue(gameStore);

    mockPrepareGame = vi.fn().mockResolvedValue(undefined);
    mockGameDispose = vi.fn();
    mockRoundDispose = vi.fn();

    const gameSpecifics = {
      prepareGame: mockPrepareGame,
      disposables: {
        gameDispose: mockGameDispose,
        roundDispose: mockRoundDispose,
      } as GameSpecificDispose,
    };

    if (stateTransitions) {
      reactionDisposer = autorun(() => {
        stateTransitions.push(gameStore.state);
      });
    }

    return renderHook(() => useGameEngine(gameStore, noop, gameSpecifics));
  };

  beforeEach(() => {
    // Mock the GameEngineService listener setup
    vi.mocked(GameEngineService.addGameRoundListener).mockImplementation(
      (callback) => {
        roundMessageCallback = callback;
      },
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();

    reactionDisposer?.();
  });

  it('should initialize correctly if myTurn', async () => {
    const stateTransitions: GameState[] = [];

    renderTestee(stateTransitions);

    expect(GameEngineService.addGameRoundListener).toHaveBeenCalled();
    expect(mockPrepareGame).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stateTransitions).toEqual([GameState.IDLE, GameState.PREPARE_ROUND]);
  });

  it('should initialize correctly if not myTurn', async () => {
    const stateTransitions: GameState[] = [];

    renderTestee(stateTransitions, false);

    expect(GameEngineService.addGameRoundListener).toHaveBeenCalled();
    expect(mockPrepareGame).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stateTransitions).toEqual([GameState.IDLE]);
  });

  it('should handle startNewRound correctly', async () => {
    const stateTransitions: GameState[] = [];
    const { result } = renderTestee(stateTransitions);

    await waitFor(() =>
      expect(stateTransitions).toEqual([
        GameState.IDLE,
        GameState.PREPARE_ROUND,
      ]),
    );

    result.current.startNewRound();

    expect(GameEngineService.notifyRoundStart).toHaveBeenCalledWith(
      gameStore.playerId,
    );

    expect(stateTransitions).toEqual([
      GameState.IDLE,
      GameState.PREPARE_ROUND,
      GameState.ROUND_START,
      GameState.PLAYER_TURN,
    ]);
  });

  it('should handle setCurrentScore correctly', () => {
    const { result } = renderTestee();

    const score = 150;

    result.current.updateCurrentScore(score);

    result.current.playerTurnComplete();

    expect(GameEngineService.notifyPlayerTurnComplete).toHaveBeenCalledWith({
      playerId: gameStore.playerId,
      round: gameStore.currentRound,
      score,
    });

    expect(gameStore.roundResults).toContainEqual({
      playerId: gameStore.playerId,
      round: gameStore.currentRound,
      score,
    });
  });

  it('should handle playerTurnComplete correctly', () => {
    const { result } = renderTestee();

    const score = 150;

    result.current.playerTurnComplete(score);

    expect(GameEngineService.notifyPlayerTurnComplete).toHaveBeenCalledWith({
      playerId: gameStore.playerId,
      round: gameStore.currentRound,
      score,
    });

    expect(gameStore.roundResults).toContainEqual({
      playerId: gameStore.playerId,
      round: gameStore.currentRound,
      score,
    });
  });

  it("should handle endPlayerRound correctly when it is player's turn", () => {
    const { result } = renderTestee();

    gameStore.setState(GameState.ROUND_END);

    result.current.endPlayerRound();

    expect(GameEngineService.notifyTurnSwitch).toHaveBeenCalled();
    expect(gameStore.isMyTurn).toBe(false);
  });

  it('should not call notifyTurnSwitch when in GAME_OVER state', () => {
    const { result } = renderTestee();

    gameStore.setState(GameState.GAME_OVER);

    result.current.endPlayerRound();

    expect(GameEngineService.notifyTurnSwitch).not.toHaveBeenCalled();
  });

  it("should not call notifyTurnSwitch when it is not player's turn", () => {
    const { result } = renderTestee(undefined, false);

    gameStore.setState(GameState.ROUND_END);

    result.current.endPlayerRound();

    expect(GameEngineService.notifyTurnSwitch).not.toHaveBeenCalled();
  });

  it('should handle START_ROUND message from other player correctly', () => {
    const stateTransitions: GameState[] = [];
    renderTestee(stateTransitions, false);

    if (roundMessageCallback) {
      roundMessageCallback({
        state: 'START_ROUND',
        playerId: 'player2', // Not the current player
      });
    }

    expect(gameStore.opponentId).toBe('player2');
    expect(stateTransitions).toEqual([
      GameState.IDLE,
      GameState.ROUND_START,
      GameState.SPECTATOR_TURN,
    ]);
  });

  it('should handle PLAYER_TURN_COMPLETE message correctly', () => {
    renderTestee(undefined, false);

    const score = 200;
    const round = 1;

    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score,
      round,
    });

    // Verify round result was added
    expect(gameStore.roundResults).toContainEqual({
      playerId: 'player2',
      round,
      score,
    });
  });

  it('should handle SWITCH_TURNS message correctly', () => {
    renderTestee(undefined, false);

    if (roundMessageCallback) {
      roundMessageCallback({
        state: 'SWITCH_TURNS',
      });
    }

    expect(gameStore.isMyTurn).toBe(true);
    expect(gameStore.state).toBe(GameState.IDLE);
  });

  it('should call game-specific disposables when appropriate', () => {
    renderTestee();

    // Setup for GAME_OVER
    gameStore.currentRound = 2; // Final round
    gameStore.maxRounds = 2;
    gameStore.opponentId = 'player2';
    gameStore.roundResults = [
      { playerId: 'player1', round: 1, score: 100 },
      { playerId: 'player2', round: 1, score: 150 },
      { playerId: 'player1', round: 2, score: 200 },
    ];

    // Player 2 completes the final turn - should trigger GAME_OVER
    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score: 175,
      round: 2,
    });

    // Verify game-specific dispose was called
    expect(gameStore.state).toBe(GameState.GAME_OVER);
    expect(GameEngineService.dispose).toHaveBeenCalled();
    expect(mockGameDispose).toHaveBeenCalled();
    expect(mockRoundDispose).not.toHaveBeenCalled();

    // Reset mocks
    vi.clearAllMocks();

    // Test ROUND_END case
    renderTestee();
    gameStore.currentRound = 1;
    gameStore.maxRounds = 2;
    gameStore.roundResults = [];

    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score: 150,
      round: 1,
    });

    // Verify round-specific dispose was called
    expect(gameStore.state).toBe(GameState.ROUND_END);
    expect(GameEngineService.playerTurnCleanup).toHaveBeenCalled();
    expect(mockRoundDispose).toHaveBeenCalled();
    expect(mockGameDispose).not.toHaveBeenCalled();
  });

  it('should advance to next round when both players complete a round', () => {
    renderTestee();

    // Set up initial state
    gameStore.currentRound = 1;
    gameStore.roundResults = [];
    gameStore.opponentId = 'player2';

    // Player 1 completes their turn
    gameStore.roundResults.push({
      playerId: 'player1',
      round: 1,
      score: 100,
    });

    // Player 2 completes their turn
    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score: 150,
      round: 1,
    });

    // Both players have played in this round, and we receive a switch turns signal
    roundMessageCallback!({
      state: 'SWITCH_TURNS',
    });

    // Verify round was incremented
    expect(gameStore.currentRound).toBe(2);
  });

  it('should follow correct state transitions for a complete game', async () => {
    const stateTransitions: GameState[] = [];
    const { result } = renderTestee(stateTransitions);

    gameStore.maxRounds = 2;

    // Start game
    await waitFor(() => expect(gameStore.state).toBe(GameState.PREPARE_ROUND));
    expect(mockPrepareGame).toHaveBeenCalledTimes(1);

    gameStore.opponentId = 'player2';

    // Round 1 - Player 1
    result.current.startNewRound();
    expect(gameStore.state).toBe(GameState.PLAYER_TURN);

    // Player 1 completes turn
    result.current.playerTurnComplete(100);
    expect(gameStore.state).toBe(GameState.ROUND_END);
    expect(mockRoundDispose).toHaveBeenCalledTimes(1);

    result.current.endPlayerRound();

    // Round 1 - Player 2 (remote)
    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score: 150,
      round: 1,
    });
    roundMessageCallback!({ state: 'SWITCH_TURNS' });

    // Round 2 - Player 1
    expect(gameStore.currentRound).toBe(2);
    result.current.startNewRound();
    result.current.playerTurnComplete(200);
    expect(gameStore.roundResults).toHaveLength(3);
    result.current.endPlayerRound();

    expect(gameStore.roundResults).toEqual([
      { playerId: 'player1', round: 1, score: 100 },
      { playerId: 'player2', round: 1, score: 150 },
      { playerId: 'player1', round: 2, score: 200 },
    ]);

    // Round 2 - Player 2 (final round)
    roundMessageCallback!({
      state: 'PLAYER_TURN_COMPLETE',
      playerId: 'player2',
      score: 175,
      round: 2,
    });

    expect(gameStore.roundResults).toHaveLength(4);
    expect(gameStore.roundResults).toContainEqual({
      playerId: 'player2',
      round: 2,
      score: 175,
    });
    expect(gameStore.currentRound).toBe(2);
    expect(gameStore.maxRounds).toBe(2);

    expect(gameStore.state).toBe(GameState.GAME_OVER);
    expect(GameEngineService.dispose).toHaveBeenCalled();
    expect(mockGameDispose).toHaveBeenCalled();
  });

  it('should clean up listeners on unmount', () => {
    const { unmount } = renderTestee();

    unmount();

    expect(GameEngineService.removeGameRoundListener).toHaveBeenCalled();
  });
});
