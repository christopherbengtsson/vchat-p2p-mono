import type { Request, Response, NextFunction } from 'express';
import { CustomError, type Maybe } from '@mono/common-dto';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw CustomError.badState('API_KEY is not defined');
}

const use = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as Maybe<string>;

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  const isValid = apiKey === API_KEY;

  if (!isValid) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
};

export const ApiKeyMiddleware = {
  use,
};
