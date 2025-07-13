import { Counter, Histogram } from 'prom-client';
import { log } from '../../../common/util/logger.js';

const captchaVerificationTotal = new Counter({
  name: 'captcha_verification_total',
  help: 'Total number of captcha verification attempts',
  labelNames: ['result', 'error_type'] as const,
});

const captchaVerificationDuration = new Histogram({
  name: 'captcha_verification_duration_seconds',
  help: 'Duration of captcha verification requests',
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const recordVerificationSuccess = () => {
  try {
    captchaVerificationTotal.inc({ result: 'success' });
  } catch (error) {
    log.error({ error }, 'Failed to record captcha success metric');
  }
};

const recordVerificationFailure = (errorType = 'unknown') => {
  try {
    captchaVerificationTotal.inc({ result: 'failure', error_type: errorType });
  } catch (error) {
    log.error({ error }, 'Failed to record captcha failure metric');
  }
};

const recordVerificationDuration = (durationSeconds: number) => {
  try {
    captchaVerificationDuration.observe(durationSeconds);
  } catch (error) {
    log.error({ error }, 'Failed to record captcha duration metric');
  }
};

export const CaptchaMetricsService = {
  recordVerificationSuccess,
  recordVerificationFailure,
  recordVerificationDuration,
};
