import type { Browser, Response as PlaywrightResponse } from '@playwright/test';
import { SupabaseClientWrapper } from '@mono/common-supabase';
import type { DatabaseUser } from '../model/DatabaseUser';
import { TestUserMapper } from '../mapper/toTestUser';
import { TestUser } from '../model/TestUser';

const URL = process.env.TEST_SUPABASE_URL;
const KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const SupabaseClient = SupabaseClientWrapper.getInstance({
  url: URL,
  key: KEY,
});

export class SupabaseAdmin {
  private testUserPassword: string;

  generatedUsers: DatabaseUser[] = [];
  fingerprints: string[] = [];

  constructor() {
    const testUserPassword = process.env.TEST_USER_PASSWORD;

    if (!testUserPassword) {
      throw new Error('TEST_USER_PASSWORD env variable is not set');
    }
    this.testUserPassword = testUserPassword;
  }

  getGeneratedUserByEmail(email: string) {
    const user = this.generatedUsers.find((user) => user.email === email);
    if (!user) {
      throw new Error('TestUser not found');
    }
    return user;
  }

  async removeAllGeneratedUsers() {
    for (const user of this.generatedUsers) {
      await SupabaseClient.instance.auth.admin
        .deleteUser(user.id)
        .catch((err) => {
          console.error('Failed to remove user', user, err);
        });
    }

    this.generatedUsers = [];
  }

  private async generateTestUser(title: string, suffix: string) {
    const email = `${title}-test-${suffix}@test.com`;
    const { data, error } = await SupabaseClient.instance.auth.admin.createUser(
      {
        email,
        password: this.testUserPassword,
        email_confirm: true,
      },
    );

    if (error) {
      throw error;
    }

    if (email !== data.user.email) {
      throw new Error('Email does not match');
    }

    const user: DatabaseUser = {
      id: data.user.id,
      email,
      password: this.testUserPassword,
    };

    this.generatedUsers.push(user);

    return user;
  }

  async generateTestUsers(
    numberOfUsers: number,
    browser: Browser,
    testTitle: string,
    onlyTestLastNumbers?: number,
  ) {
    const transformedTestTitle = testTitle.replaceAll(' ', '-').toLowerCase();
    const testUsers = await Promise.all(
      Array.from(Array(numberOfUsers)).map((_, index) =>
        this.generateTestUser(transformedTestTitle, String(index)),
      ),
    );

    return TestUserMapper.to(
      testUsers,
      browser,
      testTitle,
      onlyTestLastNumbers,
    );
  }

  async insertReports(testUsers: TestUser[], numberOfReports: number) {
    const userToReport = testUsers.pop() as TestUser;

    for (let i = 0; i < numberOfReports; i++) {
      const reporter = testUsers[i];

      await SupabaseClient.instance
        .from('user_reports')
        .insert({
          reporter_id: reporter.id,
          user_id_to_report: userToReport.id,
          reason: 'INAPPROPRIATE_BEHAVIOR',
        })
        .throwOnError();

      await SupabaseClient.instance
        .from('ignored_users')
        .insert({
          user_id: reporter.id,
          ignored_user_id: userToReport.id,
        })
        .throwOnError();
    }
  }

  async saveGeneratedFingerprint(
    signaturePromise: Promise<PlaywrightResponse>,
  ) {
    const response = await signaturePromise;
    const data = await response.json();

    if (data.fingerprint) {
      this.fingerprints.push(data.fingerprint);
    }
  }

  async removeAllTestGeneratedFingerprints() {
    for (const fingerprint of this.fingerprints) {
      await SupabaseClient.instance
        .from('blacklist')
        .delete()
        .eq('fingerprint', fingerprint);
    }

    this.fingerprints = [];
  }
}
