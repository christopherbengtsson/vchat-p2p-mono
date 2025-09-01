import type { TemplatedApp } from 'uWebSockets.js';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { CaptchaService } from '../service/CaptchaService.js';
import type { RateLimitOptions } from '../../uws/model/RateLimitOptions.js';
import { UwsUtil } from '../../uws/util/UwsUtil.js';

// Bot Protection Rate Limits
// Dev: 50 (Testing needs) | Prod: 5 (Stricter - captcha failures are suspicious)
// Block Duration: 600s (10min penalty for failed captchas)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 50 : 5,
  duration: 300, // 5 minutes
  blockDuration: 600, // 10 minutes (longer for captcha failures)
  keyPrefix: 'captcha-verify',
  execEvenly: process.env.NODE_ENV === 'production',
};

const handleCaptchaVerify = UwsUtil.createHandler((ctx) => {
  UwsUtil.parseJsonBody<{ token: string }>(ctx, {
    maxSize: UwsUtil.BODY_SIZE_LIMITS.TINY,
    rateLimitOptions,
    onComplete: async (body) => {
      if (!body) return;

      if (!UwsUtil.validateString(body.token, 1, 1000)) {
        UwsUtil.sendJson(ctx.res, '400 Bad Request', {
          success: false,
          error: 'Missing captcha token',
        });
        return;
      }

      const isVerified = await CaptchaService.verifyCaptchaToken(body.token);

      UwsUtil.sendJson(ctx.res, '200 OK', { success: isVerified });
    },
  });
});

const register = (app: TemplatedApp) => {
  app.post(HttpRoutePaths[HttpRoute.CAPTCHA_VERIFY], handleCaptchaVerify);
};

export const CaptchaController = {
  register,
};
