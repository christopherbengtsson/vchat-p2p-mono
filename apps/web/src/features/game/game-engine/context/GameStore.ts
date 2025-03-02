import { Maybe } from '@mono/common-dto';
import { makeAutoObservable, reaction } from 'mobx';

export type GameType = 'pitchPlane' | 'otherGame';

export enum GameState {
  IDLE = 'IDLE',
  PREPARE_ROUND = 'PREPARE_ROUND',
  ROUND_START = 'ROUND_START',
  PLAYER_TURN = 'PLAYER_TURN',
  SPECTATOR_TURN = 'SPECTATOR_TURN',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER',
}
/**
 * Game State Flow
 *
 * Initial Setup:
 * - Player1 has isMyTurn = true
 * - Player2 has isMyTurn = false
 * - Each player plays one turn each round
 *
 * State Transitions:
 *
 * 1. IDLE → PREPARE_ROUND (automatic for active player)
 *    - When a player is in IDLE state with isMyTurn=true
 *    - useAutomaticStateTransitions calls GameEngineService.initGamePerquisites()
 *    - Transitions to PREPARE_ROUND
 *
 * 2. PREPARE_ROUND → ROUND_START (user action)
 *    - StartGameAlertDialog is shown
 *    - When button is clicked, startNewRound() is called
 *    - Notifies other player via GameEngineService.notifyRoundStart()
 *    - Both players transition to ROUND_START
 *
 * 3. ROUND_START → PLAYER_TURN/SPECTATOR_TURN (automatic)
 *    - Player with isMyTurn=true: transitions to PLAYER_TURN
 *    - Player with isMyTurn=false: transitions to SPECTATOR_TURN
 *
 * 4. Game Play Phase
 *    - Active player draws/plays on canvas (PlayerContainer)
 *    - Inactive player views canvas stream (SpectatorContainer)
 *
 * 5. Turn Completion
 *    - Active player calls playerTurnComplete(score)
 *    - Notifies other player via GameEngineService.notifyPlayerTurnComplete()
 *    - Game checks if round should end:
 *      - If round === maxRounds AND next player has already played this round:
 *        - Both players transition to GAME_OVER
 *        - GameEngineService.dispose() is called for full cleanup
 *      - Otherwise:
 *        - Both players transition to ROUND_END
 *        - GameEngineService.playerTurnCleanup() is called
 *
 * 6. Results Phase
 *    - Both players show ResultDialogContainer
 *    - When active player clicks button in ResultDialogContainer:
 *      - If in GAME_OVER: dialog closes, game ends
 *      - If in ROUND_END:
 *        - endPlayerRound() is called
 *        - Notifies turn switch via GameEngineService.notifyTurnSwitch()
 *        - Both players transition to IDLE
 *        - isMyTurn values are swapped between players
 *        - If bothPlayersPlayedRound is true, currentRound is incremented
 *
 * 7. Return to Step 1 with new active player
 */

export interface RoundResult {
  playerId: string;
  round: number;
  score: number;
  gameSpecificData?: unknown;
}

export interface Params {
  gameType: GameType;
  maxRounds: number;
}

export class GameStore {
  // Core game state
  opponentId: Maybe<string>;
  state: GameState = GameState.IDLE;
  currentRound = 1;
  maxRounds: number;
  isMyTurn: boolean;
  roundResults: RoundResult[] = [];

  // Player identifiers
  readonly playerId: string;
  readonly gameType: GameType;

  constructor(
    playerId: string,
    isMyTurn: boolean,
    config: Partial<Params> = {},
  ) {
    this.playerId = playerId;
    this.isMyTurn = isMyTurn;
    this.gameType = config.gameType ?? 'pitchPlane';
    this.maxRounds = config.maxRounds ?? 1;

    makeAutoObservable(this, {
      playerId: false,
      gameType: false,
    });

    reaction(
      () => this.state,
      (state) => {
        console.log('GameStore state', state);
      },
    );
  }

  get roundInProgress(): boolean {
    return [GameState.PLAYER_TURN, GameState.SPECTATOR_TURN].includes(
      this.state,
    );
  }

  get isGameOver(): boolean {
    return this.state === GameState.GAME_OVER;
  }

  get myTotalScore(): number {
    return this.roundResults
      .filter((result) => result.playerId === this.playerId)
      .reduce((total, result) => total + result.score, 0);
  }

  get bothPlayersPlayedRound(): boolean {
    const meCompleted = !!this.roundResults.find(
      (result) =>
        result.playerId === this.playerId && result.round === this.currentRound,
    );

    const opponentId = this.opponentId;

    const opponentCompleted: boolean =
      !!opponentId &&
      !!this.roundResults.find(
        (result) =>
          result.playerId === opponentId && result.round === this.currentRound,
      );

    return meCompleted && opponentCompleted;
  }

  get opponentTotalScore(): number {
    return this.roundResults
      .filter((result) => result.playerId !== this.playerId)
      .reduce((total, result) => total + result.score, 0);
  }

  get latestRoundResult(): RoundResult | null {
    return this.roundResults.length > 0
      ? this.roundResults[this.roundResults.length - 1]
      : null;
  }
}
