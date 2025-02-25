import type { InviteResponse } from './InviteResponse.js';
import type { RoundData } from './RoundData.js';

export type GameData =
  | {
      type: 'INVITE';
    }
  | {
      type: 'INVITE_RESPONSE';
      response: InviteResponse;
    }
  | {
      type: 'ROUND_UPDATE';
      data: RoundData;
    };
