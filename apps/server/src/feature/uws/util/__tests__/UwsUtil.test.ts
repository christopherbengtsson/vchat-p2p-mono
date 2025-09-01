import { UwsTestUtils } from '../../../../common/test-utils/UwsTestUtils.js';
import { UwsUtil } from '../UwsUtil.js';

describe('UwsUtil Integration Tests', () => {
  let server: ReturnType<typeof UwsTestUtils.createServer>;

  beforeAll(() => {
    server = UwsTestUtils.createServer();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    // Register test routes
    server.get(
      '/test-get',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.sendJson(ctx.res, '200 OK', {
          success: true,
          method: ctx.method,
        });
      }),
    );

    server.post(
      '/test-post',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.parseJsonBody(ctx, {
          onComplete: async (body) => {
            UwsUtil.sendJson(ctx.res, '200 OK', { received: body });
          },
        });
      }),
    );

    server.get(
      '/test-error',
      UwsUtil.createHandler(() => {
        throw new Error('Test error');
      }),
    );

    server.get(
      '/test-validation/:param',
      UwsUtil.createHandler((ctx) => {
        const param = UwsUtil.validateString(ctx.query.value, 3, 10);
        if (!param) {
          UwsUtil.sendError(ctx.res, '400 Bad Request', 'Invalid param');
          return;
        }
        UwsUtil.sendResponse(ctx.res, '200 OK', `Valid: ${param}`);
      }),
    );

    server.post(
      '/test-large-body',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.parseJsonBody(ctx, {
          maxSize: 100,
          onComplete: async (body) => {
            UwsUtil.sendJson(ctx.res, '200 OK', {
              size: JSON.stringify(body).length,
            });
          },
        });
      }),
    );

    server.get(
      '/test-async',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.runAsync(ctx, {
          work: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            UwsUtil.sendJson(ctx.res, '200 OK', { async: true });
          },
        });
      }),
    );

    server.get(
      '/test-no-api-key',
      UwsUtil.createHandler(
        (ctx) => {
          UwsUtil.sendResponse(ctx.res, '200 OK', 'No API key required');
        },
        { validateApiKey: false },
      ),
    );

    // New routes for testing updated functionality
    server.post(
      '/test-timeout-body',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.parseJsonBody(ctx, {
          timeoutMs: 50,
          onComplete: async (body) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            UwsUtil.sendJson(ctx.res, '200 OK', { received: body });
          },
        });
      }),
    );

    server.get(
      '/test-timeout-async',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.runAsync(ctx, {
          timeoutMs: 100,
          work: async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            UwsUtil.sendJson(ctx.res, '200 OK', { async: true });
          },
        });
      }),
    );

    server.post(
      '/test-tiny-limit',
      UwsUtil.createHandler((ctx) => {
        UwsUtil.parseJsonBody(ctx, {
          onComplete: async (body) => {
            UwsUtil.sendJson(ctx.res, '200 OK', { received: body });
          },
        });
      }),
    );
  });

  describe('createHandler', () => {
    it('should handle GET requests successfully', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-get`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(200);
    });

    it('should extract headers and IP correctly', async () => {
      server.get(
        '/test-headers',
        UwsUtil.createHandler((ctx) => {
          UwsUtil.sendJson(ctx.res, '200 OK', {
            ip: ctx.ip,
            hasApiKey: 'x-api-key' in ctx.headers,
          });
        }),
      );

      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-headers`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      const data = await response.json();
      expect(data.ip).toBe('123');
      expect(data.hasApiKey).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-error`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Internal error');
    });

    it('should work without API key validation', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-no-api-key`,
      );

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('No API key required');
    });
  });

  describe('sendJson', () => {
    it('should send JSON responses correctly', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-get`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');

      const data = await response.json();
      expect(data).toEqual({ success: true, method: 'GET' });
    });
  });

  describe('sendError', () => {
    it('should send error responses with correct content type', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-error`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain');
    });
  });

  describe('parseJsonBody', () => {
    it('should parse JSON body successfully', async () => {
      const testData = { name: 'test', value: 123 };

      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-post`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toEqual(testData);
    });

    it('should reject invalid JSON', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-post`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: '{ invalid json',
        },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid JSON');
    });

    it('should reject body that exceeds maxSize', async () => {
      const largeData = { data: 'x'.repeat(200) };

      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-large-body`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(largeData),
        },
      );

      expect(response.status).toBe(413);
      const text = await response.text();
      expect(text).toBe('Request body too large');
    });
  });

  describe('runAsync', () => {
    it('should execute async work successfully', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-async`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.async).toBe(true);
    });
  });

  describe('validateString', () => {
    it('should validate string length correctly', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-validation/param?value=valid`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('Valid: valid');
    });

    it('should reject strings that are too short', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-validation/param?value=ab`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid param');
    });

    it('should reject strings that are too long', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-validation/param?value=verylongstring`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid param');
    });

    it('should reject non-string values', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-validation/param`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('Invalid param');
    });
  });

  describe('BODY_SIZE_LIMITS', () => {
    it('should export body size constants', () => {
      expect(UwsUtil.BODY_SIZE_LIMITS.TINY).toBe(2 * 1024);
      expect(UwsUtil.BODY_SIZE_LIMITS.SMALL).toBe(10 * 1024);
      expect(UwsUtil.BODY_SIZE_LIMITS.MEDIUM).toBe(100 * 1024);
      expect(UwsUtil.BODY_SIZE_LIMITS.LARGE).toBe(1024 * 1024);
      expect(UwsUtil.BODY_SIZE_LIMITS.XLARGE).toBe(10 * 1024 * 1024);
    });

    it('should use SMALL as default maxSize in parseJsonBody', async () => {
      const tinyData = { data: 'x'.repeat(UwsUtil.BODY_SIZE_LIMITS.SMALL + 1) };
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-tiny-limit`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tinyData),
        },
      );

      expect(response.status).toBe(413);
    });
  });

  describe('createHandler with enhanced error handling', () => {
    it('should handle response initialization failure gracefully', () => {
      const handler = UwsUtil.createHandler((ctx) => {
        UwsUtil.sendJson(ctx.res, '200 OK', { success: true });
      });

      const mockRes = {
        writeStatus: vi.fn(),
        end: vi.fn(),
      };

      const mockReq = {
        getMethod: () => 'GET',
        getUrl: () => '/test',
        getQuery: () => '',
        forEach: vi.fn(),
      };

      handler(mockRes as any, mockReq as any);
      expect(mockRes.writeStatus).toHaveBeenCalledWith(
        '500 Internal Server Error',
      );
      expect(mockRes.end).toHaveBeenCalledWith(
        'Response initialization failed',
      );
    });
  });

  describe('parseJsonBody with timeout', () => {
    it('should handle normal requests without timeout', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-timeout-body`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toEqual({ test: 'data' });
    });

    it('should handle aborted requests with cleanup', async () => {
      const controller = new AbortController();

      setTimeout(() => controller.abort(), 50);

      try {
        await fetch(`http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-post`, {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
          signal: controller.signal,
        });
      } catch (error) {
        expect((error as Error).name).toBe('AbortError');
      }
    });
  });

  describe('runAsync with timeout', () => {
    it('should timeout on slow async work', async () => {
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-timeout-async`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(504);
      const text = await response.text();
      expect(text).toBe('Operation timeout');
    }, 10000);

    it('should handle async errors properly', async () => {
      server.get(
        '/test-async-error',
        UwsUtil.createHandler((ctx) => {
          UwsUtil.runAsync(ctx, {
            work: async () => {
              throw new Error('Async error');
            },
          });
        }),
      );

      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-async-error`,
        {
          headers: UwsTestUtils.defaultHeaders() as Record<string, string>,
        },
      );

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Internal error');
    });
  });

  describe('Enhanced body parsing features', () => {
    it('should handle different body size limits', async () => {
      server.post(
        '/test-medium-limit',
        UwsUtil.createHandler((ctx) => {
          UwsUtil.parseJsonBody(ctx, {
            maxSize: UwsUtil.BODY_SIZE_LIMITS.MEDIUM,
            onComplete: async (body) => {
              UwsUtil.sendJson(ctx.res, '200 OK', { received: body });
            },
          });
        }),
      );

      const mediumData = { data: 'x'.repeat(50 * 1024) }; // 50KB
      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-medium-limit`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mediumData),
        },
      );

      expect(response.status).toBe(200);
    });

    it('should handle custom timeout settings', async () => {
      server.post(
        '/test-custom-timeout',
        UwsUtil.createHandler((ctx) => {
          UwsUtil.parseJsonBody(ctx, {
            timeoutMs: 5000, // 5 second timeout
            onComplete: async (body) => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              UwsUtil.sendJson(ctx.res, '200 OK', { received: body });
            },
          });
        }),
      );

      const response = await fetch(
        `http://localhost:${UwsTestUtils.DEFAULT_PORT}/test-custom-timeout`,
        {
          method: 'POST',
          headers: {
            ...(UwsTestUtils.defaultHeaders() as Record<string, string>),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
        },
      );

      expect(response.status).toBe(200);
    }, 10000);
  });
});
