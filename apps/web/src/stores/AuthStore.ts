import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { SupabaseClient } from '../features/supabase/client';

export class AuthStore {
  private _session: Session | null = null;
  private _authenticated = false;

  private _userUpgraded = false;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.session = session;
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.session = session;

      const authenticated = !!session;
      if (authenticated !== this.authenticated) {
        this.authenticated = authenticated;
      }
    });
  }

  get session() {
    return this._session;
  }
  set session(session: Session | null) {
    this._session = session;
  }

  get authenticated() {
    return this._authenticated;
  }
  set authenticated(authenticated: boolean) {
    this._authenticated = authenticated;
  }

  get userUpgraded() {
    return this._userUpgraded;
  }
  set userUpgraded(userUpgraded: boolean) {
    this._userUpgraded = userUpgraded;
  }
}
