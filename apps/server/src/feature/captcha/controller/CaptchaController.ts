import type { Express } from 'express';
import { log } from '../../../common/util/logger.js';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { RateLimiterMiddleware } from '../../../common/middleware/RateLimiterMiddleware.js';
import { ApiKeyMiddleware } from '../../../common/middleware/ApiKeyMiddleware.js';
import { CaptchaService } from '../service/CaptchaService.js';

const register = (app: Express) => {
  app.post(
    HttpRoutePaths[HttpRoute.CAPTCHA_VERIFY],
    RateLimiterMiddleware.use,
    ApiKeyMiddleware.use,
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
