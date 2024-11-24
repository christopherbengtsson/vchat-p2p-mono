import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { CallStore } from './CallStore';
import { MediaStore } from './MediaStore';
import { GameStore } from './GameStore';

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
  callStore: CallStore;
  gameStore: GameStore;

  constructor() {
    this.authStore = new AuthStore();
    this.socketStore = new SocketStore(this);
    this.mediaStore = new MediaStore();
    this.callStore = new CallStore(this);
    this.gameStore = new GameStore(this);
  }
}
