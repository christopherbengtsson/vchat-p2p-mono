import { type TemplatedApp } from 'uWebSockets.js';
import { CustomError } from '@mono/common-dto';
import { HttpRoute } from '../../../../common/config/model/HttpRoute.js';
import { UwsTestUtils } from '../../../../common/test-utils/UwsTestUtils.js';
import { MetricsController } from '../MetricsController.js';
import { MetricsService } from '../../../job/bullmq/service/MetricsService.js';

describe('MetricsController', () => {
  let server: TemplatedApp;

  beforeEach(() => {
    server = UwsTestUtils.createServer();

    vi.spyOn(MetricsService, 'getBullMQPrometheusMetrics').mockResolvedValue(
      'BullMQ-metrics-mock',
    );
  });

  afterEach(() => {
    server.close();
  });

  it('works', async () => {
    MetricsController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(HttpRoute.METRICS);

    expect(statusCode).toBe(200);
    expect(await body.text()).toMatchSnapshot();
  });

  it('returns 400 when no ip', async () => {
    MetricsController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(HttpRoute.METRICS, {
      headers: {},
    });

    expect(statusCode).toBe(400);
    expect(await body.text()).toBe('IP address not found');
  });

  it('should return 500 on server error', async () => {
    vi.spyOn(
      MetricsService,
      'getBullMQPrometheusMetrics',
    ).mockRejectedValueOnce(CustomError.internal('Oh no'));

    MetricsController.register(server);

    const { statusCode, body } = await UwsTestUtils.request(HttpRoute.METRICS);

    expect(statusCode).toBe(500);
    expect(await body.text()).toBe('Internal error');
  });
});
