import { ApiKeyMiddleware } from '../ApiKeyMiddleware.js';
import { UwsUtil } from '../../util/UwsUtil.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import type { RequestContext } from '../../model/RequestContext.js';

const ctxMock = {
  headers: { 'x-api-key': 'x-api-key-mock' },
  res: { cork: vi.fn() },
} as unknown as RequestContext;

describe('ApiKeyMiddleware', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY', 'x-api-key-mock');
    ServerConfigService.init(process.env);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('should pass when valid api key', () => {
    const spy = vi.spyOn(UwsUtil, 'sendError');

    const result = ApiKeyMiddleware.use(ctxMock);
    expect(result).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should return false for missing api key', () => {
    const spy = vi.spyOn(UwsUtil, 'sendError');

    const result = ApiKeyMiddleware.use({
      ...ctxMock,
      headers: { 'x-api-key': 'x-api-key-invalid-mock' },
    });
    expect(result).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('should return false for faulty api key', () => {
    const spy = vi.spyOn(UwsUtil, 'sendError');

    const result = ApiKeyMiddleware.use({ ...ctxMock, headers: {} });
    expect(result).toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
