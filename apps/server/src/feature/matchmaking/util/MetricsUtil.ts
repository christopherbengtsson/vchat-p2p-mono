import { isDefined } from '@mono/common-util';
import type { MatchmakingMetrics } from '../model/MatchmakingMetrics.js';

const calculateTotalDuration = (result: MatchmakingMetrics): number =>
  isDefined(result.completeDuration)
    ? result.completeDuration
    : isDefined(result.earlyReturnDuration)
      ? result.earlyReturnDuration
      : 0;

const hasMatches = (matchCount: number): boolean => matchCount > 0;

export const MetricsUtil = {
  calculateTotalDuration,
  hasMatches,
};
