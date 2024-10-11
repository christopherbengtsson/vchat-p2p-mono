import { makeAutoObservable } from 'mobx';
import { AppState } from './model/AppState';
import { ErrorState } from './model/ErrorState';
import type { RootStore } from './RootStore';
import type { SocketStore } from './SocketStore';
import type { CallStore } from './CallStore';

export class MainStore {
  private socketStore: SocketStore;
  private callStore: CallStore;

  private _appState: AppState = AppState.START;
  private _errorState: ErrorState | undefined = undefined;

  private _localStreamPlacement: 'background' | 'mini' = 'background';

  private _nrOfAvailableUsers = 0;

  constructor({ socketStore, callStore }: RootStore) {
    this.socketStore = socketStore;
    this.callStore = callStore;

    makeAutoObservable(this, {
      // TODO: Check overrides
      /**
       * Like observable, but only reassignments will be tracked.
       * The assigned values are completely ignored and will NOT be
       * automatically converted to observable/autoAction/flow.
       * For example, use this if you intend to store immutable data in an observable field.
       */
    });
  }

  get appState() {
    return this._appState;
  }
  set appState(state: AppState) {
    this._appState = state;
  }

  get errorState() {
    return this._errorState;
  }
  set errorState(state: ErrorState | undefined) {
    this._errorState = state;
  }

  get localStreamPlacement() {
    return this._localStreamPlacement;
  }
  set localStreamPlacement(placement: 'background' | 'mini') {
    this._localStreamPlacement = placement;
  }

  get nrOfAvailableUsers() {
    return this._nrOfAvailableUsers;
  }
  set nrOfAvailableUsers(count: number) {
    this._nrOfAvailableUsers = count;
  }

  findMatch(slow?: boolean) {
    this.appState = AppState.IN_QUEUE;

    if (slow) {
      setTimeout(() => {
        this.socketStore.socket.emit('find-match', this.socketStore.id);
      }, 2000);
    } else {
      this.socketStore.socket.emit('find-match', this.socketStore.id);
    }
  }
  cancelMatch() {
    this.appState = AppState.START;
    this.socketStore.socket.emit('cancel-match', this.socketStore.id);
  }

  async onMatchFound(roomId: string, partnerId: string, isPolite: boolean) {
    console.log('match found', partnerId);
    this.callStore.initNewCall(roomId, partnerId, isPolite);
  }
}
