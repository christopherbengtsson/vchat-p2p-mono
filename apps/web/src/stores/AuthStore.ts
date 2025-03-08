import { action, computed, observable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import { CustomError, type Maybe } from '@mono/common-dto';
import { SupabaseClient } from '@/common/clients/supabase';

export class AuthStore {
  @observable.ref accessor session: Maybe<Session>;
  @observable accessor userUpgraded = false;
  @observable accessor temporarilyBanned = false;
  @observable accessor permanentlyBanned = false;
  @observable accessor isLoading = true;

  constructor() {
    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      this.setSession(session);
      this.setLoading(false);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });
  }

  @computed
  get authenticated() {
    return !!this.session;
  }

  @computed
  get userId() {
    if (!this.session?.user.id) {
      throw CustomError.unauthorized('User ID is not defined');
    }

    return this.session.user.id;
  }

  @action
  setLoading = (isLoading: boolean) => {
    this.isLoading = isLoading;
  };

  @action
  setSession = (session: Maybe<Session>) => {
    this.session = session;
  };

  @action
  setUserUpgraded = (userUpgraded: boolean) => {
    this.userUpgraded = userUpgraded;
  };

  @action
  setTemporarilyBanned = (banned: boolean) => {
    this.temporarilyBanned = banned;
  };

  @action
  setPermanentlyBanned = (banned: boolean) => {
    this.permanentlyBanned = banned;
  };
}
