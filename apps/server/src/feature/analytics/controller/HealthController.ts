import type { Express } from 'express';
import type { ServerConfig } from '../../../common/config/model/ServerConfig.js';
import { HttpRoute } from '../../../common/config/model/HttpRoute.js';

const register = (app: Express, serverConfig: ServerConfig) => {
  app.get(serverConfig.httpRoutePaths[HttpRoute.HEALTH], (_req, res) => {
    res.status(200).send('Ok');
  });
};

export const HealthController = {
  register,
};
