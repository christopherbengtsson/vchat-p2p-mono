import { configure } from 'mobx';
import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { mediaStore, type MediaStore } from './MediaStore';

configure({ enforceActions: 'observed' });

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;

  constructor() {
    this.authStore = new AuthStore();
    this.socketStore = new SocketStore(this);
    this.mediaStore = mediaStore;
  }
}
