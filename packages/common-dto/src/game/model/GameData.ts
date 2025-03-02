import type { RoundData } from './RoundData.js';

export interface GameData {
  type: 'GAME_ROUND';
  data: RoundData;
}
