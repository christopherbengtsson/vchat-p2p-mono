import { type TemplatedApp } from 'uWebSockets.js';
import { HttpRoute } from '../../../../common/config/model/HttpRoute.js';
import { UwsTestUtils } from '../../../../common/test-utils/UwsTestUtils.js';
import { CaptchaController } from '../CaptchaController.js';
import { CaptchaService } from '../../service/CaptchaService.js';

vi.mock('../../service/CaptchaService.js');

describe('CaptchaController', () => {
  let server: TemplatedApp;

  let mockIp: string;

  beforeEach(() => {
    server = UwsTestUtils.createServer();
    mockIp = UwsTestUtils.defaultHeaders()['x-forwarded-for'];

    vi.spyOn(CaptchaService, 'verifyCaptchaToken').mockResolvedValue(true);
  });

  afterEach(() => {
    server.close();
  });

  it('should return 200 with success true when captcha is verified', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token: 'valid-captcha-token' }),
      },
    );

    expect(statusCode).toBe(200);
    expect(await body.json()).toEqual({ success: true });
    expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(
      mockIp,
      'valid-captcha-token',
    );
  });

  it('should return 200 with success false when captcha verification fails', async () => {
    vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue(false);

    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token: 'invalid-captcha-token' }),
      },
    );

    expect(statusCode).toBe(200);
    expect(await body.json()).toEqual({ success: false });
    expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(
      mockIp,
      'invalid-captcha-token',
    );
  });

  it('should return 401 if no api-key', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-api-key': undefined,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    expect(statusCode).toBe(401);
    expect(await body.text()).toEqual('Missing API key');
  });

  it('should return 403 if invalid api-key', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-api-key': 'wrong',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    expect(statusCode).toBe(403);
    expect(await body.text()).toEqual('Invalid API key');
  });

  it('should return 400 when token is missing', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    expect(statusCode).toBe(400);
    expect(await body.json()).toEqual({
      success: false,
      error: 'Missing captcha token',
    });
  });

  it('should return 400 when token is empty string', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token: '' }),
      },
    );

    expect(statusCode).toBe(400);
    expect(await body.json()).toEqual({
      success: false,
      error: 'Missing captcha token',
    });
  });

  it('should return 400 when no ip', async () => {
    CaptchaController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(
      HttpRoute.CAPTCHA_VERIFY,
      {
        method: 'POST',
        headers: {
          ...UwsTestUtils.defaultHeaders(),
          'x-forwarded-for': undefined,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token: 'valid-captcha-token' }),
      },
    );

    expect(statusCode).toBe(400);
    expect(await body.text()).toBe('IP address not found');
  });
});
