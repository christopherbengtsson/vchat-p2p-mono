import { GameData } from '@mono/common-dto';

export type DataChannelMessage =
  | {
      type: 'GAME';
      data: GameData;
    }
  | {
      type: 'VIDEO_TOGGLE' | 'AUDIO_TOGGLE';
      toggle: boolean;
    };
