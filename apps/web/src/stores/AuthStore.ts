import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { SupabaseClient } from '../common/supabase/client';

export class AuthStore {
  session: Session | null = null;
  authenticated = false;
  userUpgraded = false;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.setSession(session);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);

      const authenticated = !!session;
      if (authenticated !== this.authenticated) {
        this.setAuthenticated(authenticated);
      }
    });
  }

  setSession(session: Session | null) {
    this.session = session;
  }

  setAuthenticated(authenticated: boolean) {
    this.authenticated = authenticated;
  }
}
