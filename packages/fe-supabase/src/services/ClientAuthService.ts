import type { SupabaseClient } from '@supabase/supabase-js';

async function loginAnonymously(client: SupabaseClient) {
  const { error } = await client.auth.signInAnonymously();

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
  });

  if (error) {
    throw error;
  }
}

async function logout(
  client: SupabaseClient,
  scope: 'global' | 'local' | 'others' = 'local',
) {
  const { error } = await client.auth.signOut({
    scope,
  });

  if (error) {
    throw error;
  }
}

export const ClientAuthService = {
  loginAnonymously,
  loginWithEmail,
  upgradeAnonymousAccount,
  logout,
};
