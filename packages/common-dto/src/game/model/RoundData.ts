export type RoundData =
  | {
      state: 'START_ROUND';
      playerId: string;
    }
  | {
      state: 'PLAYER_TURN_COMPLETE';
      playerId: string;
      round: number;
      score: number;
    }
  | {
      state: 'SWITCH_TURNS';
    };
