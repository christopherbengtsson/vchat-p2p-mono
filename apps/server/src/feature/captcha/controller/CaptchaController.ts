import type { Express } from 'express';
import { log } from '../../../common/util/logger.js';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { RateLimiterMiddleware } from '../../../common/middleware/RateLimiterMiddleware.js';
import { ApiKeyMiddleware } from '../../../common/middleware/ApiKeyMiddleware.js';
import { CaptchaService } from '../service/CaptchaService.js';
import type { RateLimitOptions } from '../../../common/middleware/model/RateLimitOptions.js';

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

const register = (app: Express) => {
  app.post(
    HttpRoutePaths[HttpRoute.CAPTCHA_VERIFY],
    ApiKeyMiddleware.use,
    RateLimiterMiddleware.use(rateLimitOptions),
    async (req, res) => {
      try {
        const { token } = req.body;

        if (!token) {
          res.status(400).json({
            success: false,
            error: 'Missing captcha token',
          });
          return;
        }

        const isVerified = await CaptchaService.verifyCaptchaToken(token);

        res.status(200).json({
          success: isVerified,
        });
      } catch (error) {
        log.error(
          {
            error: error instanceof Error ? error.message : error,
          },
          'Error in captcha verification endpoint',
        );

        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    },
  );
};

export const CaptchaController = {
  register,
};
