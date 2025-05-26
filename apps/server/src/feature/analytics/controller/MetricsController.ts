import type { Express } from 'express';
import { register as promRegister } from 'prom-client';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';

const register = (app: Express) => {
  app.get(HttpRoutePaths[HttpRoute.METRICS], async (_req, res) => {
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
