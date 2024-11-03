import { makeAutoObservable } from 'mobx';
import { ErrorState } from './model/ErrorState';

export class UiStore {
  private _errorState: ErrorState | undefined = undefined;

  constructor() {
    makeAutoObservable(this);
  }

  get errorState() {
    return this._errorState;
  }
  set errorState(state: ErrorState | undefined) {
    this._errorState = state;
  }
}
