import type { Session } from '@supabase/supabase-js';
import { SupabaseClient } from '../supabase/client';
import { makeAutoObservable, runInAction } from 'mobx';

export class AuthStore {
  session: Session | null = null;

  constructor() {
    makeAutoObservable(this);

    SupabaseClient.instance.auth.getSession().then(({ data: { session } }) => {
      console.log('Session', session);
      this.setSession(session);
    });

    SupabaseClient.instance.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });
  }

  private setSession(session: Session | null) {
    runInAction(() => {
      this.session = session;
    });
  }

  async loginAnonymously() {
    const res = await SupabaseClient.instance.auth.signInAnonymously();
    console.log('Logged in anonymously', res);
  }
}
