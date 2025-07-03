import { configure } from 'mobx';
import { AuthStore } from './AuthStore';
import { SocketStore } from './SocketStore';
import { mediaStore, type MediaStore } from './MediaStore';
import {
  contentModerationStore,
  type ContentModerationStore,
} from './ContentModerationStore';

configure({ enforceActions: 'observed' });

export class RootStore {
  authStore: AuthStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
  contentModerationStore: ContentModerationStore;

  constructor() {
    this.authStore = new AuthStore();
    this.socketStore = new SocketStore(this);
    this.mediaStore = mediaStore;
    this.contentModerationStore = contentModerationStore;
  }
}
