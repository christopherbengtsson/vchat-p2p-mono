import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { SupabaseClient } from '../supabase/client';

export class AuthStore {
  private _session: Session | null = null;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.setSession(session);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });
  }

  get session() {
    return this._session;
  }
  set session(session: Session | null) {
    this._session = session;
  }

  private setSession(session: Session | null) {
    this.session = session;
  }

  async loginAnonymously() {
    await SupabaseClient.instance.auth.signInAnonymously();
  }
}
