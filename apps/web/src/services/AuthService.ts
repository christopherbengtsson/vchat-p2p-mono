import { SupabaseClient } from '../supabase/client';

async function loginAnonymously() {
  const { error } = await SupabaseClient.instance.auth.signInAnonymously({
    options: { data: { warnings: 0, blocked: false } },
  });

  if (error) {
    throw error;
  }
}

async function loginWithEmail(email: string, password: string) {
  const { error } = await SupabaseClient.instance.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

async function upgradeAnonymousAccount(email: string, password: string) {
  const { error } = await SupabaseClient.instance.auth.updateUser({
    email,
    password,
    data: {
      is_anonymous: false,
    },
  });

  if (error) {
    throw error;
  }
}

async function reportUser(_userId: string) {
  //TODO: pass userId to server => ban for x period of time
  throw new Error('Not implemented');
}

async function logout() {
  const { error } = await SupabaseClient.instance.auth.signOut({
    scope: 'local',
  });
  if (error) {
    throw error;
  }
}

export const AuthService = {
  loginAnonymously,
  loginWithEmail,
  upgradeAnonymousAccount,
  reportUser,
  logout,
};
