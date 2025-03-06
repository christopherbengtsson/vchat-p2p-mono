import { Maybe } from '@mono/common-dto';
import { makeAutoObservable } from 'mobx';

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
