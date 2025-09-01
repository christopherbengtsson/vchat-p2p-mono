export const BODY_SIZE_LIMITS = {
  TINY: 2 * 1024, // 2KB - for simple tokens, captcha
  SMALL: 10 * 1024, // 10KB - for small JSON payloads
  MEDIUM: 100 * 1024, // 100KB - for moderate data
  LARGE: 1024 * 1024, // 1MB - for complex data
  XLARGE: 10 * 1024 * 1024, // 10MB - for file uploads
} as const;
