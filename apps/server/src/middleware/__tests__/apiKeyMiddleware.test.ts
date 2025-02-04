import type { Request, Response, NextFunction } from 'express';
import { apiKeyMiddleware } from '../apiKeyMiddleware.js';

describe('apiKeyMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();

    vi.clearAllMocks();
  });

  test('should call next() when valid API key is provided', () => {
    mockRequest.headers = {
      'x-api-key': process.env.API_KEY,
    };

    apiKeyMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  test('should return 401 when API key is missing', () => {
    apiKeyMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing API key',
    });
  });

  test('should return 403 when invalid API key is provided', () => {
    mockRequest.headers = {
      'x-api-key': 'wrong-api-key',
    };

    apiKeyMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid API key',
    });
  });
});
