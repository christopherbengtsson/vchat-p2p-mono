const FEATURE_ENABLED = 'true' as const;

const isGamesEnabled = () =>
  import.meta.env.VITE_GAMES_FEATURE_ENABLED === FEATURE_ENABLED;

export const FeatureFlagUtil = {
  isGamesEnabled,
};
