import { InviteData, RoundData } from '@mono/common-dto';

export type DataChannelMessage =
  | {
      type: 'INVITE';
      data: InviteData;
    }
  | {
      type: 'GAME';
      data: RoundData;
    }
  | {
      type: 'VIDEO_TOGGLE' | 'AUDIO_TOGGLE';
      toggle: boolean;
    };
