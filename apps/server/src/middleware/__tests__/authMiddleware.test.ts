import jwt from 'jsonwebtoken';
import logger from '../../utils/logger.js';
import { validateJwtMiddleware } from '../authMiddleware.js';
import type { IncomingMessage } from '../../models/IncomingMessage.js';

vi.mock('jsonwebtoken');
vi.mock('../../utils/logger');

describe('validateJwtMiddleware', () => {
  const mockNext = vi.fn();
  let mockReq: Partial<IncomingMessage>;

  beforeEach(() => {
    mockReq = {
      _query: { sid: undefined },
      headers: {},
      user: undefined,
    };

    vi.clearAllMocks();
  });

  it('should call next() if handshake is already done', () => {
    mockReq._query = { sid: 'some-sid' };
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect(logger.info).toHaveBeenCalled();
  });

  it('should return error if no token is provided', () => {
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(new Error('No token provided'));
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return error if token format is invalid', () => {
    mockReq.headers = { authorization: 'Invalid Token' };
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(new Error('Invalid token format'));
    expect(logger.error).toHaveBeenCalled();
  });

  it('should return error if token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalidtoken' };
    vi.mocked(jwt.verify).mockImplementation(
      (_token, _secret, callback: any) => {
        callback(new Error('Invalid token'), null);
      },
    );
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(new Error('Invalid token'));
    expect(logger.error).toHaveBeenCalled();
  });

  it('should set user in request if token is valid', () => {
    const mockUser = { id: '123', name: 'Test User' };
    mockReq.headers = { authorization: 'Bearer validtoken' };
    vi.mocked(jwt.verify).mockImplementation(
      (_token, _secret, callback: any) => {
        callback(null, mockUser);
      },
    );
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockReq.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should handle TokenExpiredError', () => {
    mockReq.headers = { authorization: 'Bearer expiredtoken' };
    const tokenExpiredError = new Error('Token expired');
    tokenExpiredError.name = 'TokenExpiredError';
    vi.mocked(jwt.verify).mockImplementation(
      (_token, _secret, callback: any) => {
        callback(tokenExpiredError, null);
      },
    );
    validateJwtMiddleware(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(new Error('Invalid token'));
    expect(logger.error).toHaveBeenCalled();

    // TODO: Add an expectation here for emitting to socket to refresh token
    // once that functionality is implemented
  });
});
