import http from 'http';
import express, { urlencoded, json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { register } from 'prom-client';

const init = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

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

  return http.createServer(app);
};

export const HttpServer = {
  init,
};
