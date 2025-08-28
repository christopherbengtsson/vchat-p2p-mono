import { log } from '../../../common/util/logger.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { SupabaseClient } from '../../../common/client/SupabaseClient.js';
import { AnalyticsBootstrapService } from '../../analytics/service/AnalyticsBootstrapService.js';

const init = async () => {
  const config = ServerConfigService.init(process.env);
  log.level = config.config.logLevel;

  await RedisClient.init();

  SupabaseClient.init();

  AnalyticsBootstrapService.init();
};

export const BootstrapService = {
  init,
};
