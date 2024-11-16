import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { CallStore } from './CallStore';
import { MediaStore } from './MediaStore';

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
  callStore: CallStore;

  constructor() {
    this.authStore = new AuthStore();
    this.socketStore = new SocketStore(this);
    this.mediaStore = new MediaStore();
    this.callStore = new CallStore(this);
  }
}
