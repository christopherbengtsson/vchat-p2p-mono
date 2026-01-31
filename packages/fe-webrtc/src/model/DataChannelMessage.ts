import { InviteData, RoundData, ChatData } from '@mono/common-dto';

export type DataChannelMessage =
  | {
      type: 'CHAT';
      data: ChatData;
    }
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
