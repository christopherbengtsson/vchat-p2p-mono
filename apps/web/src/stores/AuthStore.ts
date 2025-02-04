import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { CustomError, type Maybe } from '@mono/common-dto';
import { SupabaseClient } from '@/common/supabase/client';

export class AuthStore {
  session: Maybe<Session>;
  authenticated = false;
  userUpgraded = false;
  banned = false;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.setSession(session);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
      console.log(_event, session);

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

  setSession(session: Maybe<Session>) {
    this.session = session;
  }

  setAuthenticated(authenticated: boolean) {
    this.authenticated = authenticated;
  }

  setUserUpgraded(userUpgraded: boolean) {
    this.userUpgraded = userUpgraded;
  }

  setBanned(banned: boolean) {
    this.banned = banned;
  }
}
