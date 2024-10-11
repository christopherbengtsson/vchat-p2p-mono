import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { MainStore } from './MainStore';
import { CallStore } from './CallStore';
import { MediaStore } from './MediaStore';

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
  mainStore: MainStore;
  callStore: CallStore;

  constructor() {
    this.authStore = new AuthStore();
    this.socketStore = new SocketStore(this);
    this.mediaStore = new MediaStore(this);
    this.callStore = new CallStore(this);
    this.mainStore = new MainStore(this);
  }
}
