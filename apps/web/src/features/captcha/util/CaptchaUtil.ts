// Caddy reverse proxy directs traffic from /api/v1/captcha/ to the standalone Cap server in deployed environments
// In local development, we point directly to the Cap server at http://localhost:8001/{siteKey}/
const getApiEndpoint = () => {
  const siteKey = import.meta.env.VITE_CAP_SITE_KEY;

  return import.meta.env.DEV
    ? `http://localhost:8001/${siteKey}/`
    : `${import.meta.env.VITE_SERVER_URL}/api/v1/captcha/${siteKey}/`;
};

export const CaptchaUtil = {
  getApiEndpoint,
};
