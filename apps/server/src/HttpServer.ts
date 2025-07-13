import http from 'http';
import express, { urlencoded, json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { HealthController } from './feature/analytics/controller/HealthController.js';
import { MetricsController } from './feature/analytics/controller/MetricsController.js';
import { SignatureController } from './feature/moderation/controller/SignatureController.js';
import { CaptchaController } from './feature/captcha/controller/CaptchaController.js';

const init = () => {
  const app = express();

  /** Middlewares */
  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.set('trust proxy', true);

  /** Controllers */
  HealthController.register(app);
  MetricsController.register(app);
  SignatureController.register(app);
  CaptchaController.register(app);

  return http.createServer(app);
};

export const HttpServer = {
  init,
};
