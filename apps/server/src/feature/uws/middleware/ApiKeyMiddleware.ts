import { timingSafeEqual } from 'node:crypto';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { UwsUtil } from '../util/UwsUtil.js';
import type { RequestContext } from '../model/RequestContext.js';

const isValid = (apiKey: string, validKey: string): boolean => {
  try {
    return timingSafeEqual(Buffer.from(apiKey), Buffer.from(validKey));
  } catch {
    return false;
  }
};

const use = (ctx: RequestContext) => {
  const apiKey = ctx.headers['x-api-key'];

  if (!apiKey) {
    UwsUtil.sendError(ctx.res, '401 Unauthorized', 'Missing API key');
    return false;
  }

  const validKey = ServerConfigService.getConfig().secrets.server.apiKey;

  if (!isValid(apiKey, validKey)) {
    UwsUtil.sendError(ctx.res, '403 Forbidden', 'Invalid API key');
    return false;
  }

  return true;
};

export const ApiKeyMiddleware = {
  use,
};
