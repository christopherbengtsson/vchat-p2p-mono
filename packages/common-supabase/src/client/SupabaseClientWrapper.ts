import { CustomError, type Database } from '@mono/common-dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClientConfig } from '../model/SupabaseClientConfig.js';

export class SupabaseClientWrapper {
  private static instances = new Map<string, SupabaseClientWrapper>();
  private readonly client: SupabaseClient<Database>;

  private constructor(config: SupabaseClientConfig) {
    if (!config.url || !config.key) {
      throw CustomError.badRequest(
        'Invalid configuration for SupabaseClientWrapper',
      );
    }

    this.client = createClient<Database>(config.url, config.key);
  }

  static getInstance(config: SupabaseClientConfig): SupabaseClientWrapper {
    const instanceKey = `${config.url}-${config.key}`;

    if (!this.instances.has(instanceKey)) {
      this.instances.set(instanceKey, new SupabaseClientWrapper(config));
    }

    const instance = this.instances.get(instanceKey);

    if (!instance) {
      throw CustomError.notFound(
        'Failed to get SupabaseClientWrapper instance',
      );
    }

    return instance;
  }

  get instance(): SupabaseClient<Database> {
    return this.client;
  }
}
