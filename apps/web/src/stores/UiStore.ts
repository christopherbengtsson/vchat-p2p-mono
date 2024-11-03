import { makeAutoObservable } from 'mobx';
import { CallState } from './model/CallState';
import { ErrorState } from './model/ErrorState';
import type { RootStore } from './RootStore';
import type { SocketStore } from './SocketStore';
import type { CallStore } from './CallStore';

export class UiStore {
  private socketStore: SocketStore;
  private callStore: CallStore;

  private _callState: CallState = CallState.START;
  private _errorState: ErrorState | undefined = undefined;

  private _localStreamPlacement: 'background' | 'mini' = 'background';

  private _nrOfAvailableUsers = 0;

  constructor({ socketStore, callStore }: RootStore) {
    this.socketStore = socketStore;
    this.callStore = callStore;

    makeAutoObservable(this);
  }

  get callState() {
    return this._callState;
  }
  set callState(state: CallState) {
    this._callState = state;
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
    this.callState = CallState.IN_QUEUE;

    if (slow) {
      setTimeout(() => {
        this.socketStore.socket.emit('find-match', this.socketStore.id);
      }, 2000);
    } else {
      this.socketStore.socket.emit('find-match', this.socketStore.id);
    }
  }
  cancelMatch() {
    this.callState = CallState.START;
    this.socketStore.socket.emit('cancel-match', this.socketStore.id);
  }

  async onMatchFound(roomId: string, partnerId: string, isPolite: boolean) {
    console.log('match found', partnerId);
    this.callStore.initNewCall(roomId, partnerId, isPolite);
  }
}
