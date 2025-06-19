import type { Maybe } from '@mono/common-dto';

export interface MatchmakingJobResult {
  earlyReturnDuration: Maybe<number>;
  completeDuration: Maybe<number>;
}
