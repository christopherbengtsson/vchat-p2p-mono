import { Database } from '../../generated/models/Database.js';

type BanDurationValues = Database['public']['Enums']['ban_duration'];

export enum BanDuration {
  TIER_1 = 24,
  TIER_2 = 72,
  TIER_3 = 168,
  PERMANENT = -1,
  NO_BAN = 0,
}

export function isBanDuration(value: number): value is BanDuration {
  switch (value) {
    case BanDuration.TIER_1:
    case BanDuration.TIER_2:
    case BanDuration.TIER_3:
    case BanDuration.PERMANENT:
    case BanDuration.NO_BAN:
      return true;

    default:
      return false;
  }
}

/** Type assertions */

const _BanDurationMap: Record<BanDurationValues, BanDuration> = {
  '24': BanDuration.TIER_1,
  '72': BanDuration.TIER_2,
  '168': BanDuration.TIER_3,
  '-1': BanDuration.PERMANENT,
} as const;

type ValidateDBKeys = keyof typeof _BanDurationMap extends BanDurationValues
  ? true
  : false;
type ValidateMapKeys = BanDurationValues extends keyof typeof _BanDurationMap
  ? true
  : false;

const _dbKeysValid: ValidateDBKeys = true;
const _mapKeysValid: ValidateMapKeys = true;
