import type { InviteResponse } from './InviteResponse';
import type { RoundData } from './RoundData';

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
