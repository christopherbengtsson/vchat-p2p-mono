import { CustomError, type Maybe } from '@mono/common-dto';
import { log } from '../../util/logger.js';
import { type ServerConfig } from '../model/ServerConfig.js';
import { ServerConfigMapper } from '../mapper/ServerConfigMapper.js';
import { EnvironmentService } from './EnvironmentService.js';

let serverConfigInstance: Maybe<ServerConfig>;

const init = (env: NodeJS.ProcessEnv): ServerConfig => {
  if (serverConfigInstance) {
    log.warn('ServerConfigService has already been initialized.');
    return serverConfigInstance;
  }

  const envConfig = EnvironmentService.load(env);
  serverConfigInstance = ServerConfigMapper.to(envConfig); // Throws if validation fails
  return serverConfigInstance;
};

const getConfig = (): ServerConfig => {
  if (!serverConfigInstance) {
    throw CustomError.badState('ServerConfigService.init has not been called.');
  }

  return serverConfigInstance;
};

export const ServerConfigService = {
  init,
  getConfig,
};
