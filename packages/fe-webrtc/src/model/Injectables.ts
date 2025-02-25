import { GameData } from '@mono/common-dto';

export interface Injectables {
  handleIncomingGameMessage?: (message: GameData) => void;
  setRemoteCanvasStream?: (stream: MediaStream) => void;
}
