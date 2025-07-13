export enum HttpRoute {
  BASE = '/api/v1',
  HEALTH = '/health',
  METRICS = '/metrics',
  SIGNATURE = '/signature',
  CAPTCHA_VERIFY = '/captcha/verify',
}

export const HttpRoutePaths: Record<HttpRoute, string> = {
  [HttpRoute.BASE]: HttpRoute.BASE,
  [HttpRoute.HEALTH]: `${HttpRoute.BASE}${HttpRoute.HEALTH}`,
  [HttpRoute.METRICS]: `${HttpRoute.BASE}${HttpRoute.METRICS}`,
  [HttpRoute.SIGNATURE]: `${HttpRoute.BASE}${HttpRoute.SIGNATURE}`,
  [HttpRoute.CAPTCHA_VERIFY]: `${HttpRoute.BASE}${HttpRoute.CAPTCHA_VERIFY}`,
} as const;
