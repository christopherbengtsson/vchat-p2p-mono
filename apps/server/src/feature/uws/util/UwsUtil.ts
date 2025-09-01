import type { HttpResponse, HttpRequest } from 'uWebSockets.js';
import { log } from '../../../common/util/logger.js';
import { ApiKeyMiddleware } from '../middleware/ApiKeyMiddleware.js';
import { RateLimiterMiddleware } from '../middleware/RateLimiterMiddleware.js';
import type { RateLimitOptions } from '../model/RateLimitOptions.js';
import type { RequestContext } from '../model/RequestContext.js';
import type { HandlerOptions } from '../model/HandlerOptions.js';
import type { SafeResponse } from '../model/SafeResponse.js';

/**
 * Creates a safe handler with automatic error handling
 * Works for both GET (no body) and POST (with body) endpoints
 */
const createHandler = (
  handler: (ctx: RequestContext) => void,
  { validateApiKey = true }: HandlerOptions = {},
) => {
  return (res: HttpResponse, req: HttpRequest) => {
    // Prepare response
    const safeRes = res as SafeResponse;
    safeRes.done = false;
    safeRes.aborted = false;

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
 * Parses JSON body - MUST be called synchronously in handler
 * Executes callback when body is complete
 */
const parseJsonBody = <T>(
  ctx: RequestContext,
  options: {
    maxSize?: number;
    rateLimitOptions?: RateLimitOptions;
    onComplete: (body: T | null) => Promise<void>;
  },
): void => {
  const { res } = ctx;
  const { maxSize = 1024 * 1024, onComplete } = options;

  let buffer: Buffer | undefined;
  let totalSize = 0;

  res.onData((ab, isLast) => {
    if (res.aborted) return;

    if (options.rateLimitOptions && !requireIp(ctx)) return;

    const chunk = Buffer.from(ab);
    totalSize += chunk.length;

    if (totalSize > maxSize) {
      sendError(res, '413 Payload Too Large', 'Request body too large');
      return;
    }

    if (isLast) {
      const finalBuffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;

      // Parse and handle async
      (async () => {
        /** Important: Parse body before any async code */
        try {
          let parsed: T | null = null;
          try {
            parsed = JSON.parse(finalBuffer.toString()) as T;
          } catch {
            sendError(res, '400 Bad Request', 'Invalid JSON');
            return;
          }

          if (
            options.rateLimitOptions &&
            !(await RateLimiterMiddleware.use(ctx, options.rateLimitOptions))
          ) {
            return;
          }

          await onComplete(parsed);
        } catch (error) {
          log.error('Body handler error:', error);
          if (!res.done && !res.aborted) {
            sendError(res, '500 Internal Server Error', 'Internal error');
          }
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
    work: () => Promise<void>;
  },
): void => {
  if (options.rateLimitOptions && !requireIp(ctx)) return;

  (async () => {
    try {
      if (
        options.rateLimitOptions &&
        !(await RateLimiterMiddleware.use(ctx, options.rateLimitOptions))
      ) {
        return;
      }

      await options.work();
    } catch (error) {
      log.error('Async error:', error);
      if (!ctx.res.done && !ctx.res.aborted) {
        sendError(ctx.res, '500 Internal Server Error', 'Internal error');
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
};
