import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { CustomError, type Maybe } from '@mono/common-dto';
import { SupabaseClient } from '@/common/clients/supabase';

export class AuthStore {
  session: Maybe<Session>;
  authenticated = false;
  userUpgraded = false;
  temporarilyBanned = false;
  permanentlyBanned = false;
  isLoading = true;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.setSession(session);
      this.setLoading(false);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);

      const authenticated = !!session;
      if (authenticated !== this.authenticated) {
        this.setAuthenticated(authenticated);
      }
    });
  }

  get userId() {
    if (!this.session?.user.id) {
      throw CustomError.unauthorized('User ID is not defined');
    }

    return this.session.user.id;
  }

  setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  setSession(session: Maybe<Session>) {
    this.session = session;
  }

  setAuthenticated(authenticated: boolean) {
    this.authenticated = authenticated;
  }

  setUserUpgraded(userUpgraded: boolean) {
    this.userUpgraded = userUpgraded;
  }

  setTemporarilyBanned(banned: boolean) {
    this.temporarilyBanned = banned;
  }

  setPermanentlyBanned(banned: boolean) {
    this.permanentlyBanned = banned;
  }
}
