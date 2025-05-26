import type { Express } from 'express';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';

const register = (app: Express) => {
  app.get(HttpRoutePaths[HttpRoute.HEALTH], (_req, res) => {
    res.status(200).send('Ok');
  });
};

export const HealthController = {
  register,
};
