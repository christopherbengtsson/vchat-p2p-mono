import { Histogram, Counter, register } from 'prom-client';
import type { Maybe } from '@mono/common-dto';
import type {
  MatchmakingMetrics,
  MatchmakingOutcome,
  QueueExitReason,
} from '../../model/MatchmakingMetrics.js';
import { MetricsUtil } from '../../util/MetricsUtil.js';
import type { MatchmakingJobResult } from '../../model/MatchmakingJobResult.js';

// Histogram for tracking matchmaking processing durations
const matchmakingDurationHistogram = new Histogram({
  name: 'matchmaking_processing_duration_seconds',
  help: 'Duration of matchmaking processing jobs in seconds',
  labelNames: ['outcome', 'queue_name'] as const,
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2], // 10ms to 2s
  registers: [register],
});

// Counter for tracking matchmaking job outcomes
const matchmakingJobCounter = new Counter({
  name: 'matchmaking_jobs_total',
  help: 'Total number of matchmaking jobs processed',
  labelNames: ['outcome', 'queue_name'] as const,
  registers: [register],
});

// Counter for tracking matches created
const matchesCreatedCounter = new Counter({
  name: 'matchmaking_matches_created_total',
  help: 'Total number of user matches created',
  labelNames: ['queue_name'] as const,
  registers: [register],
});

// Counter for tracking queue entries
const queueEntryCounter = new Counter({
  name: 'matchmaking_queue_entries_total',
  help: 'Total number of users entering the matchmaking queue',
  labelNames: ['queue_name'] as const,
  registers: [register],
});

// Counter for tracking queue exits
const queueExitCounter = new Counter({
  name: 'matchmaking_queue_exits_total',
  help: 'Total number of users exiting the matchmaking queue',
  labelNames: ['queue_name', 'reason'] as const,
  registers: [register],
});

// Histogram for tracking user queue duration
const queueDurationHistogram = new Histogram({
  name: 'matchmaking_queue_duration_seconds',
  help: 'Duration users spent in the matchmaking queue before exiting',
  labelNames: ['queue_name', 'reason'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
  registers: [register],
});

const _determineOutcome = (
  result: MatchmakingJobResult,
): MatchmakingOutcome => {
  if (
    result.earlyReturnDuration !== null &&
    result.earlyReturnDuration !== undefined
  ) {
    return 'early_return';
  }
  if (
    result.completeDuration !== null &&
    result.completeDuration !== undefined
  ) {
    return 'completed';
  }
  return 'failed';
};

const _calculateDurationSeconds = (result: MatchmakingJobResult): number => {
  const durationMs = result.earlyReturnDuration ?? result.completeDuration ?? 0;
  return durationMs / 1000;
};

const _recordJobDuration = (
  queueName: string,
  earlyReturnDuration: Maybe<number>,
  completeDuration: Maybe<number>,
): void => {
  const result: MatchmakingJobResult = {
    earlyReturnDuration,
    completeDuration,
  };
  const outcome = _determineOutcome(result);
  const durationSeconds = _calculateDurationSeconds(result);

  matchmakingDurationHistogram
    .labels({ outcome, queue_name: queueName })
    .observe(durationSeconds);

  matchmakingJobCounter.labels({ outcome, queue_name: queueName }).inc();
};

const _recordMatchesCreated = (queueName: string, matchCount: number): void => {
  matchesCreatedCounter.labels({ queue_name: queueName }).inc(matchCount);
};

const recordJobFailure = (queueName: string): void => {
  matchmakingJobCounter
    .labels({ outcome: 'failed', queue_name: queueName })
    .inc();
};

const recordJobMetrics = (
  queueName: string,
  result: MatchmakingMetrics,
): void => {
  _recordJobDuration(
    queueName,
    result.earlyReturnDuration,
    result.completeDuration,
  );

  if (MetricsUtil.hasMatches(result.matchCount)) {
    _recordMatchesCreated(queueName, result.matchCount);
  }
};

const recordQueueEntry = (queueName: string): void => {
  queueEntryCounter.labels({ queue_name: queueName }).inc();
};

const recordQueueExit = (
  queueName: string,
  reason: QueueExitReason,
  durationSeconds?: number,
): void => {
  queueExitCounter.labels({ queue_name: queueName, reason }).inc();

  if (durationSeconds !== undefined) {
    queueDurationHistogram
      .labels({ queue_name: queueName, reason })
      .observe(durationSeconds);
  }
};

export const MatchmakingMetricsService = {
  recordJobMetrics,
  recordJobFailure,
  recordQueueEntry,
  recordQueueExit,
};
