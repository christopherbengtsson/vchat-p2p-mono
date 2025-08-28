import type { Express } from 'express';
import { log } from '../../../common/util/logger.js';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { RateLimiterMiddleware } from '../../../common/middleware/RateLimiterMiddleware.js';
import { ApiKeyMiddleware } from '../../../common/middleware/ApiKeyMiddleware.js';
import { FingerprintService } from '../service/FingerprintService.js';
import type { RateLimitOptions } from '../../../common/middleware/model/RateLimitOptions.js';

// Browser Fingerprinting Rate Limits
// Dev: 100 (E2E testing needs headroom) | Prod: 15 (Slightly more generous for legitimate users)
// Block Duration: 300s (Don't punish too long)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 100 : 15,
  duration: 300, // 5 minutes
  blockDuration: 300, // 5 minutes (same as duration)
  keyPrefix: 'signature',
  execEvenly: process.env.NODE_ENV === 'production',
};

const register = (app: Express) => {
  app.post(
    HttpRoutePaths[HttpRoute.SIGNATURE],
    RateLimiterMiddleware.use(rateLimitOptions),
    ApiKeyMiddleware.use,
    (req, res) => {
      const browserSignature = req.body.browserSignature;

      if (req.ip && browserSignature) {
        const fingerprint = FingerprintService.generate(
          browserSignature,
          req.headers,
          req.ip,
        );

        if (!fingerprint) {
          log.error('Failed to generate fingerprint on signature route');
          res.status(500).send('Failed to generate fingerprint');
          return;
        }

        res.status(200).json({ fingerprint });
      } else {
        res.status(400).send('Ip not found');
      }
    },
  );
};

export const SignatureController = {
  register,
};
