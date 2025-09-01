import { App } from 'uWebSockets.js';
import { HealthController } from '../../analytics/controller/HealthController.js';
import { MetricsController } from '../../analytics/controller/MetricsController.js';
import { SignatureController } from '../../moderation/controller/SignatureController.js';
import { CaptchaController } from '../../captcha/controller/CaptchaController.js';

const init = () => {
  const app = App();

  /** Controllers */
  HealthController.register(app);
  MetricsController.register(app);
  SignatureController.register(app);
  CaptchaController.register(app);

  return app;
};

export const HttpServer = {
  init,
};
