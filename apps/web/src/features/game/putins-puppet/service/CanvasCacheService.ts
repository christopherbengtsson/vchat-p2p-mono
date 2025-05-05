// Cache configuration
export const MAX_CACHE_SIZE = {
  CLOUD: 20,
  PLAYER: 10,
  PIPE: 20,
  SCORE: 30,
  BACKGROUND: 5,
  HEART: 10,
} as const;

// Centralized cache storage
const caches = {
  background: new Map<string, HTMLCanvasElement>(),
  cloud: new Map<string, HTMLCanvasElement>(),
  pipe: new Map<string, HTMLCanvasElement>(),
  player: new Map<string, HTMLCanvasElement>(),
  score: new Map<string, HTMLCanvasElement>(),
  heart: new Map<string, HTMLCanvasElement>(),
};

/**
 * Clears all caches or a specific cache type
 */
const clearCache = (cacheType?: keyof typeof caches) => {
  if (cacheType) {
    caches[cacheType].clear();
  } else {
    Object.values(caches).forEach((cache) => cache.clear());
  }
};

/**
 * Gets cache stats for debugging
 */
const getCacheStats = () => {
  return Object.entries(caches).reduce(
    (stats, [key, cache]) => {
      return {
        ...stats,
        [key]: cache.size,
      };
    },
    {} as Record<string, number>,
  );
};

export const CanvasCacheService = {
  caches,
  clearCache,
  getCacheStats,
};
