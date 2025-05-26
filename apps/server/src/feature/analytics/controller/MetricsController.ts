import type { Express } from 'express';
import { register as promRegister } from 'prom-client';
import type { ServerConfig } from '../../../common/config/model/ServerConfig.js';
import { HttpRoute } from '../../../common/config/model/HttpRoute.js';

const register = (app: Express, serverConfig: ServerConfig) => {
  app.get(serverConfig.httpRoutePaths[HttpRoute.METRICS], async (_req, res) => {
    try {
      res.set('Content-Type', promRegister.contentType);
      res.end(await promRegister.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });
};

export const MetricsController = {
  register,
};
