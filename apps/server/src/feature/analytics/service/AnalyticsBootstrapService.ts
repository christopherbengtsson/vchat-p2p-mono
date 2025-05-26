import { collectDefaultMetrics } from 'prom-client';

const init = () => {
  collectDefaultMetrics();
};

export const AnalyticsBootstrapService = {
  init,
};
