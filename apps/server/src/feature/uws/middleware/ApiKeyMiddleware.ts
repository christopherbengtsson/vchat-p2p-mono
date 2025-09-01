import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { UwsUtil } from '../util/UwsUtil.js';
import type { RequestContext } from '../model/RequestContext.js';

const use = (ctx: RequestContext) => {
  const apiKey = ctx.headers['x-api-key'];

  if (!apiKey) {
    UwsUtil.sendError(ctx.res, '401 Unauthorized', 'Missing API key');
    return false;
  }

  const validKey = ServerConfigService.getConfig().secrets.server.apiKey;
  const isValid = apiKey === validKey;

  if (!isValid) {
    UwsUtil.sendError(ctx.res, '403 Forbidden', 'Invalid API key');
    return false;
  }

  return true;
};

export const ApiKeyMiddleware = {
  use,
};
