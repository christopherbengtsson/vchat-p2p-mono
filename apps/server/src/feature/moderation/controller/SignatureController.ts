import type { TemplatedApp } from 'uWebSockets.js';
import type { BrowserSignature } from '@mono/common-dto';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { FingerprintService } from '../service/FingerprintService.js';
import type { RateLimitOptions } from '../../uws/model/RateLimitOptions.js';
import { UwsUtil } from '../../uws/util/UwsUtil.js';

const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 100 : 15,
  duration: 300,
  blockDuration: 300,
  keyPrefix: 'signature',
  execEvenly: process.env.NODE_ENV === 'production',
};

const handleSignature = UwsUtil.createHandler((ctx) => {
  UwsUtil.parseJsonBody<{ browserSignature: BrowserSignature }>(ctx, {
    rateLimitOptions,
    onComplete: async (body) => {
      if (!body) return;

      if (typeof body.browserSignature !== 'object') {
        UwsUtil.sendError(
          ctx.res,
          '400 Bad Request',
          'Invalid browserSignature',
        );
        return;
      }

      const fingerprint = FingerprintService.generate(
        body.browserSignature,
        ctx.headers,
        ctx.ip as string,
      );

      if (fingerprint) {
        UwsUtil.sendJson(ctx.res, '200 OK', { fingerprint });
      } else {
        UwsUtil.sendError(
          ctx.res,
          '500 Internal Server Error',
          'Generation failed',
        );
      }
    },
  });
});

const register = (app: TemplatedApp): void => {
  app.post(HttpRoutePaths[HttpRoute.SIGNATURE], handleSignature);
};

export const SignatureController = {
  register,
};
