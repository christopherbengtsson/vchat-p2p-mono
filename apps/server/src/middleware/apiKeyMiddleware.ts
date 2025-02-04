import type { Request, Response, NextFunction } from 'express';
import { CustomError, type Maybe } from '@mono/common-dto';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw CustomError.badState('API_KEY is not defined');
}

export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers['x-api-key'] as Maybe<string>;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const isValid = apiKey === API_KEY;

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};
