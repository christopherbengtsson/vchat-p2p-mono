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

export const CanvasCacheService = {
  caches,
  clearCache,
};
