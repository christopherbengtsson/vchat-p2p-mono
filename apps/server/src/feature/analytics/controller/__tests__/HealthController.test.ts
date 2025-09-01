import { type TemplatedApp } from 'uWebSockets.js';
import { HealthController } from '../HealthController.js';
import { HttpRoute } from '../../../../common/config/model/HttpRoute.js';
import { UwsTestUtils } from '../../../../common/test-utils/UwsTestUtils.js';

describe('HealthController', () => {
  let server: TemplatedApp;

  beforeEach(() => {
    server = UwsTestUtils.createServer();
  });

  afterEach(() => {
    server.close();
  });

  it('works', async () => {
    HealthController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(HttpRoute.HEALTH);

    expect(statusCode).toBe(200);
    expect(await body.text()).toBe('Ok');
  });

  it('returns 400 when no ip', async () => {
    HealthController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(HttpRoute.HEALTH, {
      headers: {},
    });

    expect(statusCode).toBe(400);
    expect(await body.text()).toBe('IP address not found');
  });
});
