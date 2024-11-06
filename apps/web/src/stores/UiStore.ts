import { makeAutoObservable } from 'mobx';
import { Maybe } from '@mono/common-dto';
import { PromtState } from '@/common/model/PromptState';

export class UiStore {
  private _promptState: Maybe<PromtState> = undefined;

  constructor() {
    makeAutoObservable(this);
  }

  get promptState() {
    return this._promptState;
  }
  set promptState(state: Maybe<PromtState>) {
    this._promptState = state;
  }
}
