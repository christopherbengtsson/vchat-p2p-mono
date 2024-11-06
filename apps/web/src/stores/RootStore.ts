import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { UiStore } from './UiStore';
import { CallStore } from './CallStore';
import { MediaStore } from './MediaStore';

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
  uiStore: UiStore;
  callStore: CallStore;

  constructor() {
    this.authStore = new AuthStore(this);
    this.socketStore = new SocketStore(this);
    this.mediaStore = new MediaStore(this);
    this.callStore = new CallStore(this);
    this.uiStore = new UiStore();
  }
}
