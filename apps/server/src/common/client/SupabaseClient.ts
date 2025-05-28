import { SupabaseClientWrapper } from '@mono/common-supabase';
import type { SupabaseClient as ActualSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@mono/common-dto';
import { CustomError } from '@mono/common-dto';
import { ServerConfigService } from '../config/service/ServerConfigService.js';
import { log } from '../util/logger.js';

let supabaseInstanceWrapper: SupabaseClientWrapper | null = null;

const init = () => {
  if (supabaseInstanceWrapper) {
    log.warn('Supabase client wrapper is already initialized.');
    return;
  }

  const serverConfig = ServerConfigService.getConfig();

  supabaseInstanceWrapper = SupabaseClientWrapper.getInstance({
    url: serverConfig.secrets.supabase.url,
    key: serverConfig.secrets.supabase.serviceRoleKey,
  });
};

const get = (): ActualSupabaseClient<Database> => {
  if (!supabaseInstanceWrapper) {
    throw CustomError.badState('Supabase client has not been initialized.');
  }
  return supabaseInstanceWrapper.instance;
};

export const SupabaseClient = {
  init,
  get,
};
