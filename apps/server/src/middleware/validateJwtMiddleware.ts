import jwt from 'jsonwebtoken';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { logger } from '../utils/logger.js';
import type { IncomingMessage } from '../model/IncomingMessage.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'invalid';

export const validateJwtMiddleware = (
  req: IncomingMessage,
  next: (err?: Error | null) => void,
) => {
  const isHandshake = req._query.sid === undefined;
  if (!isHandshake) {
    logger.info({ sid: req._query.sid }, 'Initial handshake already done');
    return next();
  }

  const header = req.headers['authorization'];

  if (!header) {
    logger.error({ header }, 'No token provided');
    return next(
      new CustomError(CustomErrorType.FORBIDDEN, 'No token provided'),
    );
  }

  if (!header.toLocaleLowerCase().startsWith('bearer ')) {
    logger.error({ header }, 'Invalid token format');
    return next(
      new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token format'),
    );
  }

  const token = header.substring(7);

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        // TODO: Emit to socket to refresh token??
      }
      logger.error({ err }, 'Invalid token');
      return next(new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token'));
    }

    req.user = decoded;
    next();
  });
};
