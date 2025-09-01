import { us_socket_local_port, type TemplatedApp } from 'uWebSockets.js';
import { HttpRoute } from '../../../../common/config/model/HttpRoute.js';
import { UwsTestUtils } from '../../../../common/test-utils/UwsTestUtils.js';
import { SignatureController } from '../SignatureController.js';
import { FingerprintService } from '../../service/FingerprintService.js';

describe('SignatureController', () => {
  let server: TemplatedApp;
  let port: number;

  beforeEach(() => {
    server = UwsTestUtils.createServer(
      (token) => (port = us_socket_local_port(token)),
    );

    vi.spyOn(FingerprintService, 'generate').mockReturnValue(
      'test-fingerprint',
    );
  });

  afterEach(() => {
    server.close();
  });

  it('should return 200 with fingerprint when signature is processed successfully', async () => {
    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            language: 'en-US',
            platform: 'MacIntel',
            timezone: 'America/New_York',
          },
        }),
      },
    );

    expect(statusCode).toBe(200);
    expect(await body.json()).toEqual({ fingerprint: 'test-fingerprint' });
    expect(FingerprintService.generate).toHaveBeenCalledWith(
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        language: 'en-US',
        platform: 'MacIntel',
        timezone: 'America/New_York',
      },
      expect.any(Object),
      '123',
    );
  });

  it('should return 400 on invalid payload', async () => {
    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: 'browserSignature',
        }),
      },
    );

    expect(statusCode).toBe(400);
    expect(await body.text()).toEqual('Invalid browserSignature');
  });

  it('should return 400 when no ip', async () => {
    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-forwarded-for': undefined,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
        }),
      },
    );

    expect(statusCode).toBe(400);
    expect(await body.text()).toBe('IP address not found');
  });

  it('should return 401 if no api-key', async () => {
    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-api-key': undefined,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
        }),
      },
    );

    expect(statusCode).toBe(401);
    expect(await body.text()).toEqual('Missing API key');
  });

  it('should return 403 if invalid api-key', async () => {
    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-api-key': 'wrong',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
        }),
      },
    );

    expect(statusCode).toBe(403);
    expect(await body.text()).toEqual('Invalid API key');
  });

  it('should return 500 when fingerprint generation fails', async () => {
    vi.spyOn(FingerprintService, 'generate').mockReturnValue(undefined);

    SignatureController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.SIGNATURE,
      {
        port,
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          browserSignature: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            language: 'en-US',
            platform: 'MacIntel',
            timezone: 'America/New_York',
          },
        }),
      },
    );

    expect(statusCode).toBe(500);
    expect(await body.text()).toEqual('Generation failed');
  });
});
