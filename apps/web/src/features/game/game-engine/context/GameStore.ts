import { Maybe } from '@mono/common-dto';
import { action, computed, observable } from 'mobx';

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
  @observable accessor opponentId: Maybe<string>;
  @observable accessor state: GameState = GameState.IDLE;
  @observable accessor currentRound = 1;
  @observable accessor maxRounds: number;
  @observable accessor isMyTurn: boolean;
  @observable accessor roundResults: RoundResult[] = [];

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
  }

  @action
  setState(state: GameState) {
    this.state = state;
  }

  @action
  onStartRound(state: GameState, playerId: Maybe<string>) {
    if (playerId) {
      this.opponentId = playerId;
    }
    this.setState(state);
  }

  @action
  onPlayerTurnComplete(state: GameState, roundResult: RoundResult) {
    this.roundResults.push(roundResult);
    this.setState(state);
  }

  @action
  onSwitchTurns(newRound: number, isMyTurn: boolean, state: GameState) {
    this.currentRound = newRound;
    this.isMyTurn = isMyTurn;
    this.setState(state);
  }

  @computed
  get roundInProgress(): boolean {
    return [GameState.PLAYER_TURN, GameState.SPECTATOR_TURN].includes(
      this.state,
    );
  }

  @computed
  get isGameOver(): boolean {
    return this.state === GameState.GAME_OVER;
  }

  @computed
  get myTotalScore(): number {
    return this.roundResults
      .filter((result) => result.playerId === this.playerId)
      .reduce((total, result) => total + result.score, 0);
  }

  @computed
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

  @computed
  get opponentTotalScore(): number {
    return this.roundResults
      .filter((result) => result.playerId !== this.playerId)
      .reduce((total, result) => total + result.score, 0);
  }

  @computed
  get latestRoundResult(): RoundResult | null {
    return this.roundResults.length > 0
      ? this.roundResults[this.roundResults.length - 1]
      : null;
  }
}
