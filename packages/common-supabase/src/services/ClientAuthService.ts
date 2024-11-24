import type { SupabaseClient } from '@supabase/supabase-js';

async function loginAnonymously(client: SupabaseClient) {
  const { error } = await client.auth.signInAnonymously({
    options: { data: { warnings: 0, blocked: false } },
  });

  if (error) {
    throw error;
  }
}

async function loginWithEmail(
  email: string,
  password: string,
  client: SupabaseClient,
) {
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
}

async function upgradeAnonymousAccount(
  email: string,
  password: string,
  client: SupabaseClient,
) {
  const { error } = await client.auth.updateUser({
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

async function reportUser(_userId: string, _client: SupabaseClient) {
  //TODO: pass userId to server => ban for x period of time
  throw new Error('Not implemented');
}

async function logout(client: SupabaseClient) {
  const { error } = await client.auth.signOut({
    scope: 'local',
  });
  if (error) {
    throw error;
  }
}

export const ClientAuthService = {
  loginAnonymously,
  loginWithEmail,
  upgradeAnonymousAccount,
  reportUser,
  logout,
};
