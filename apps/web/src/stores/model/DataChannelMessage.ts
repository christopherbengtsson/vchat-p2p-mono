import { GameData } from './GameData';

export interface DataChannelMessage {
  type: 'GAME';
  data: GameData;
}
