const caches = {
  background: new Map<string, HTMLCanvasElement>(),
  cloud: new Map<string, HTMLCanvasElement>(),
  pipe: new Map<string, HTMLCanvasElement>(),
  player: new Map<string, HTMLCanvasElement>(),
  score: new Map<string, HTMLCanvasElement>(),
};

const clearCache = () => {
  Object.values(caches).forEach((cache) => cache.clear());
};

export const MAX_CACHE_SIZE = {
  CLOUD: 20,
  PLAYER: 10,
  PIPE: 20,
  SCORE: 30,
} as const;

export const CanvasCacheService = {
  caches,
  clearCache,
};
