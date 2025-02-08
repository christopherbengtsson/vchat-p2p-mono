import type { Browser } from '@playwright/test';
import { SupabaseClientWrapper } from '@mono/common-supabase';
import type { DatabaseUser } from '../model/DatabaseUser';
import { TestUserMapper } from '../mapper/toTestUser';

const URL = process.env.TEST_SUPABASE_URL;
const KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const SupabaseClient = SupabaseClientWrapper.getInstance({
  url: URL,
  key: KEY,
});

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!TEST_USER_PASSWORD) {
  throw new Error('TEST_USER_PASSWORD env variable is not set');
}

let generatedUsers: DatabaseUser[] = [];

const getGeneratedUserByEmail = (email: string) => {
  const user = generatedUsers.find((user) => user.email === email);
  if (!user) {
    throw new Error('TestUser not found');
  }
  return user;
};

const removeAllGeneratedUsers = async () => {
  for (const user of generatedUsers) {
    await SupabaseClient.instance.auth.admin
      .deleteUser(user.id)
      .catch((err) => {
        console.warn('Failed to remove user', user, err);
      });
  }

  generatedUsers = [];
};

const generateTestUser = async (title: string, suffix: string) => {
  const email = `${title}-test-${suffix}@test.com`;
  const { data, error } = await SupabaseClient.instance.auth.admin.createUser({
    email,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (email !== data.user.email) {
    throw new Error('Email does not match');
  }

  const user: DatabaseUser = {
    id: data.user.id,
    email,
    password: TEST_USER_PASSWORD,
  };

  generatedUsers.push(user);

  return user;
};

const generateTestUsers = async (
  numberOfUsers: number,
  browser: Browser,
  testTitle: string,
) => {
  const transformedTestTitle = testTitle.replaceAll(' ', '-').toLowerCase();
  const testUsers = await Promise.all(
    Array.from(Array(numberOfUsers)).map((_, index) =>
      generateTestUser(transformedTestTitle, String(index)),
    ),
  );

  return TestUserMapper.to(testUsers, browser, testTitle);
};

export const SupabaseAdmin = {
  generateTestUsers,
  getGeneratedUserByEmail,
  removeAllGeneratedUsers,
};
