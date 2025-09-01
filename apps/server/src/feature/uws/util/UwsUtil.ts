import type { HttpResponse, HttpRequest } from 'uWebSockets.js';
import { log } from '../../../common/util/logger.js';
import { ApiKeyMiddleware } from '../middleware/ApiKeyMiddleware.js';
import { RateLimiterMiddleware } from '../middleware/RateLimiterMiddleware.js';
import type { RateLimitOptions } from '../model/RateLimitOptions.js';
import type { RequestContext } from '../model/RequestContext.js';
import type { HandlerOptions } from '../model/HandlerOptions.js';
import type { SafeResponse } from '../model/SafeResponse.js';
import type { BodyParseConfig } from '../model/BodyParseConfig.js';
import { BODY_SIZE_LIMITS } from './constants.js';

/**
 * Creates a safe handler with automatic error handling
 * Works for both GET (no body) and POST (with body) endpoints
 */
const createHandler = (
  handler: (ctx: RequestContext) => void,
  { validateApiKey = true }: HandlerOptions = {},
) => {
  return (res: HttpResponse, req: HttpRequest) => {
    // Prepare response with runtime validation
    const safeRes = createSafeResponse(res);
    if (!safeRes) {
      res.writeStatus('500 Internal Server Error');
      res.end('Response initialization failed');
      return;
    }

    safeRes.onAborted(() => {
      safeRes.aborted = true;
      safeRes.done = true;
    });

    // Extract request data synchronously
    const headers: Record<string, string> = {};
    req.forEach((key, value) => {
      headers[key.toLowerCase()] = value;
    });

    const ip =
      headers['x-forwarded-for']?.split(',')[0].trim() ||
      headers['x-real-ip'] ||
      headers['cf-connecting-ip'] ||
      undefined;

    const query: Record<string, string> = {};
    const queryString = req.getQuery();
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        query[key] = value;
      });
    }

    // Create context
    const ctx: RequestContext = {
      res: safeRes,
      headers,
      ip,
      query,
      method: req.getMethod().toUpperCase(),
      url: req.getUrl(),
    };

    if (validateApiKey && !ApiKeyMiddleware.use(ctx)) return;

    // Execute handler
    try {
      handler(ctx);
    } catch (error) {
      log.error('Handler sync error:', error);
      if (!safeRes.done && !safeRes.aborted) {
        sendError(safeRes, '500 Internal Server Error', 'Internal error');
      }
    }
  };
};

/**
 * Safely creates a SafeResponse with runtime validation
 */
const createSafeResponse = (res: HttpResponse): SafeResponse | null => {
  try {
    const safeRes = res as SafeResponse;
    // Initialize required properties
    safeRes.done = false;
    safeRes.aborted = false;

    // Validate critical methods exist
    if (
      typeof safeRes.onAborted !== 'function' ||
      typeof safeRes.cork !== 'function' ||
      typeof safeRes.writeStatus !== 'function' ||
      typeof safeRes.end !== 'function'
    ) {
      log.error('Invalid response object - missing required methods');
      return null;
    }

    return safeRes;
  } catch (error) {
    log.error('Failed to create safe response:', error);
    return null;
  }
};

const sendResponse = (
  res: SafeResponse,
  status: string,
  body = '',
  headers?: Record<string, string>,
): boolean => {
  if (res.done || res.aborted) return false;

  res.done = true;
  res.cork(() => {
    res.writeStatus(status);
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        res.writeHeader(key, value);
      });
    }
    res.end(body);
  });

  return true;
};

const sendJson = (
  res: SafeResponse,
  status: string,
  data: unknown,
): boolean => {
  return sendResponse(res, status, JSON.stringify(data), {
    'Content-Type': 'application/json',
  });
};

const sendError = (
  res: SafeResponse,
  status: string,
  message: string,
): boolean => {
  return sendResponse(res, status, message, {
    'Content-Type': 'text/plain',
  });
};

/**
 * Parses JSON body with timeout and proper cleanup
 * MUST be called synchronously in handler
 */
const parseJsonBody = <T>(
  ctx: RequestContext,
  options: BodyParseConfig & {
    onComplete: (body: T | null) => Promise<void>;
  },
): void => {
  const { res } = ctx;
  const {
    maxSize = BODY_SIZE_LIMITS.SMALL,
    timeoutMs = 10_000,
    onComplete,
  } = options;

  let buffer: Buffer | undefined;
  let totalSize = 0;
  let timeoutHandle: NodeJS.Timeout | undefined;
  let cleaned = false;

  // Cleanup function to prevent memory leaks
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = undefined;
    }

    // Clear buffer reference to allow GC
    buffer = undefined;
  };

  // Set timeout for request processing
  if (timeoutMs > 0) {
    timeoutHandle = setTimeout(() => {
      if (!res.done && !res.aborted) {
        sendError(res, '408 Request Timeout', 'Request timeout');
        cleanup();
      }
    }, timeoutMs);
  }

  // Handle abort to cleanup resources
  res.onAborted(() => {
    cleanup();
  });

  res.onData((ab, isLast) => {
    if (res.aborted || res.done) {
      cleanup();
      return;
    }

    if (options.rateLimitOptions && !requireIp(ctx)) {
      cleanup();
      return;
    }

    const chunk = Buffer.from(ab);
    totalSize += chunk.length;

    if (totalSize > maxSize) {
      sendError(res, '413 Payload Too Large', 'Request body too large');
      cleanup();
      return;
    }

    if (isLast) {
      // Clear timeout as we received all data
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }

      const finalBuffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

      // Clear buffer reference immediately after use
      buffer = undefined;

      // Parse and handle async
      (async () => {
        /** Important: Parse body before any async code */
        try {
          let parsed: T | null = null;
          try {
            parsed = JSON.parse(finalBuffer.toString()) as T;
          } catch {
            sendError(res, '400 Bad Request', 'Invalid JSON');
            cleanup();
            return;
          }

          if (
            options.rateLimitOptions &&
            !(await RateLimiterMiddleware.use(ctx, options.rateLimitOptions))
          ) {
            cleanup();
            return;
          }

          await onComplete(parsed);
        } catch (error) {
          log.error('Body handler error:', error);
          if (!res.done && !res.aborted) {
            sendError(res, '500 Internal Server Error', 'Internal error');
          }
        } finally {
          cleanup();
        }
      })();
    } else {
      buffer = buffer ? Buffer.concat([buffer, chunk]) : Buffer.from(chunk);
    }
  });
};

/**
 * Executes async work for endpoints without body
 */
const runAsync = (
  ctx: RequestContext,
  options: {
    rateLimitOptions?: RateLimitOptions;
    timeoutMs?: number;
    work: () => Promise<void>;
  },
): void => {
  if (options.rateLimitOptions && !requireIp(ctx)) return;

  const { timeoutMs: timeout = 30_000, work } = options;

  (async () => {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      const timeoutPromise =
        timeout > 0
          ? new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => {
                reject(new Error('Operation timeout'));
              }, timeout);
            })
          : null;

      if (
        options.rateLimitOptions &&
        !(await RateLimiterMiddleware.use(ctx, options.rateLimitOptions))
      ) {
        return;
      }

      if (timeoutPromise) {
        await Promise.race([work(), timeoutPromise]);
      } else {
        await work();
      }
    } catch (error) {
      log.error('Async error:', error);
      if (!ctx.res.done && !ctx.res.aborted) {
        const isTimeout =
          error instanceof Error && error.message === 'Operation timeout';
        if (isTimeout) {
          sendError(ctx.res, '504 Gateway Timeout', 'Operation timeout');
        } else {
          sendError(ctx.res, '500 Internal Server Error', 'Internal error');
        }
      }
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  })();
};

const requireIp = (ctx: RequestContext): boolean => {
  if (!ctx.ip) {
    sendError(ctx.res, '400 Bad Request', 'IP address not found');
    return false;
  }
  return true;
};

const validateString = (
  value: unknown,
  minLength = 1,
  maxLength = Infinity,
): string | null => {
  if (typeof value !== 'string') return null;
  if (value.length < minLength || value.length > maxLength) return null;
  return value;
};

export const UwsUtil = {
  // Handler
  createHandler,

  // Response
  sendResponse,
  sendJson,
  sendError,

  // Body parsing
  parseJsonBody,
  runAsync,

  // Validation
  validateString,

  // Constants
  BODY_SIZE_LIMITS,
};
