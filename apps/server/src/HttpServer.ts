import http from 'http';
import express, { urlencoded, json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ServerConfig } from './common/config/model/ServerConfig.js';
import { HealthController } from './feature/analytics/controller/HealthController.js';
import { MetricsController } from './feature/analytics/controller/MetricsController.js';
import { SignatureController } from './feature/moderation/controller/SignatureController.js';

const init = (serverConfig: ServerConfig) => {
  const app = express();

  /** Middlewares */
  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.set('trust proxy', true);

  /** Controllers */
  HealthController.register(app, serverConfig);
  MetricsController.register(app, serverConfig);
  SignatureController.register(app, serverConfig);

  return http.createServer(app);
};

export const HttpServer = {
  init,
};
