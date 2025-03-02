import { InviteResponse } from '../../model/InviteResponse.js';

export type InviteData =
  | {
      type: 'INVITE';
    }
  | {
      type: 'INVITE_RESPONSE';
      response: InviteResponse;
    }
  | {
      type: 'PLAYER_READY';
      playerId: string;
      initiator: boolean;
    };
