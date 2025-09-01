import jwt from 'jsonwebtoken';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import type { IncomingMessage } from '../model/IncomingMessage.js';
import { log } from '../../../common/util/logger.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'invalid';

const use = (req: IncomingMessage, next: (err?: Error | null) => void) => {
  const isHandshake = req._query.sid === undefined;
  if (!isHandshake) {
    log.info({ sid: req._query.sid }, 'Initial handshake already done');
    return next();
  }

  const header = req.headers['authorization'];

  if (!header) {
    log.error({ header }, 'No token provided');
    return next(
      new CustomError(CustomErrorType.FORBIDDEN, 'No token provided'),
    );
  }

  if (!header.toLocaleLowerCase().startsWith('bearer ')) {
    log.error({ header }, 'Invalid token format');
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
      log.error({ err }, 'Invalid token');
      return next(new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token'));
    }

    req.user = decoded;
    next();
  });
};

export const ValidateJwtMiddleware = {
  use,
};
