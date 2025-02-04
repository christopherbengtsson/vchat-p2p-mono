import http from 'http';
import express, { urlencoded, json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { register } from 'prom-client';
import { apiKeyMiddleware } from './middleware/apiKeyMiddleware.js';
import { FingerprintUtil } from './utils/FingerprintUtil.js';
import rateLimiterMiddleware from './middleware/rateLimiterMiddleware.js';
import logger from './utils/logger.js';

const BASE_API_PATH = '/api/v1';

const init = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.set('trust proxy', true);

  app.get('/health', (_req, res) => {
    res.status(200).send('Ok');
  });

  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });

  app.post(
    `${BASE_API_PATH}/signature`,
    rateLimiterMiddleware,
    apiKeyMiddleware,
    (req, res) => {
      const deviceSignature = req.body.deviceSignature;

      if (req.ip && deviceSignature) {
        const fingerprint = FingerprintUtil.generateHash(
          deviceSignature,
          req.ip,
        );

        if (!fingerprint) {
          logger.error('Failed to generate fingerprint on signature route');
          return res.status(400).send('Failed to generate fingerprint');
        }

        res.status(200).json({ fingerprint });
      } else {
        res.status(400).send('Ip not found');
      }
    },
  );

  return http.createServer(app);
};

export const HttpServer = {
  init,
};
