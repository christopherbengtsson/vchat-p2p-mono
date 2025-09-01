import jwt from 'jsonwebtoken';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import type { IncomingMessage } from '../../model/IncomingMessage.js';
import { ValidateJwtMiddleware } from '../ValidateJwtMiddleware.js';
import { log } from '../../../../common/util/logger.js';

vi.mock('jsonwebtoken');
vi.mock('../../utils/logger');

describe('ValidateJwtMiddleware', () => {
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
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect(log.info).toHaveBeenCalled();
  });

  it('should return error if no token is provided', () => {
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      new CustomError(CustomErrorType.FORBIDDEN, 'No token provided'),
    );
    expect(log.error).toHaveBeenCalled();
  });

  it('should return error if token format is invalid', () => {
    mockReq.headers = { authorization: 'Invalid Token' };
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token format'),
    );
    expect(log.error).toHaveBeenCalled();
  });

  it('should return error if token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalidtoken' };
    vi.mocked(jwt.verify).mockImplementation(
      (_token, _secret, callback: any) => {
        callback(
          new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token'),
          null,
        );
      },
    );
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      new CustomError(CustomErrorType.FORBIDDEN, 'Invalid token'),
    );
    expect(log.error).toHaveBeenCalled();
  });

  it('should set user in request if token is valid', () => {
    const mockUser = { id: '123', name: 'Test User' };
    mockReq.headers = { authorization: 'Bearer validtoken' };
    vi.mocked(jwt.verify).mockImplementation(
      (_token, _secret, callback: any) => {
        callback(null, mockUser);
      },
    );
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
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
    ValidateJwtMiddleware.use(mockReq as IncomingMessage, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      CustomError.forbidden('Invalid token'),
    );
    expect(log.error).toHaveBeenCalled();

    // TODO: Add an expectation here for emitting to socket to refresh token
    // once that functionality is implemented
  });
});
