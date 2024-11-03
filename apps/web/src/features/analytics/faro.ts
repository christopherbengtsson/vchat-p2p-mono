import { matchRoutes } from 'react-router-dom';
import {
  createReactRouterV6DataOptions,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

if (import.meta.env.PROD) {
  initializeFaro({
    url: import.meta.env.VITE_FARO_COLLECTOR_URL,
    app: {
      name: 'vchat-client',
      version: APP_VERSION,
      environment: 'production',
    },
    sessionTracking: {
      samplingRate: 1,
      persistent: true,
    },
    instrumentations: [
      // Mandatory, omits default instrumentations otherwise.
      ...getWebInstrumentations(),

      // Tracing package to get end-to-end visibility for HTTP requests.
      new TracingInstrumentation(),

      // React integration for React applications.
      new ReactIntegration({
        router: createReactRouterV6DataOptions({
          matchRoutes,
        }),
      }),
    ],
  });
}
