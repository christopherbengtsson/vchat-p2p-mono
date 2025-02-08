import { FeatureFlagUtil } from '../FeatureFlagUtil';

describe('FeatureFlagUtil', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return true for enabled features', () => {
    vi.stubEnv('VITE_GAMES_FEATURE_ENABLED', 'true');
    const isEnabled = FeatureFlagUtil.isGamesEnabled();

    expect(isEnabled).toBe(true);
  });

  it('should return false for disabled features', () => {
    vi.stubEnv('VITE_GAMES_FEATURE_ENABLED', 'false');
    const isEnabled = FeatureFlagUtil.isGamesEnabled();

    expect(isEnabled).toBe(false);
  });

  it('should return false when env variable is not set', () => {
    vi.stubEnv('VITE_GAMES_FEATURE_ENABLED', undefined);
    const isEnabled = FeatureFlagUtil.isGamesEnabled();

    expect(isEnabled).toBe(false);
  });
});
