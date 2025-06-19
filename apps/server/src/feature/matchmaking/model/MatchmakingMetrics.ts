import type { Maybe } from '@mono/common-dto';

export interface MatchmakingMetrics {
  completeDuration: Maybe<number>;
  earlyReturnDuration: Maybe<number>;
  matchCount: number;
}

export type MatchmakingOutcome = 'early_return' | 'completed' | 'failed';

export type QueueExitReason =
  | 'matched'
  | 'cancel-match'
  | 'disconnect'
  | 'timeout';
