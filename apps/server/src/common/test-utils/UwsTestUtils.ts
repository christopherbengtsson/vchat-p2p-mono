import {
  App,
  us_socket_local_port,
  type us_listen_socket,
} from 'uWebSockets.js';
import type { UndiciHeaders } from 'undici/types/dispatcher.js';
import { request as _request, Dispatcher } from 'undici';
import { HttpRoutePaths, type HttpRoute } from '../config/model/HttpRoute.js';
import { ServerConfigService } from '../config/service/ServerConfigService.js';

const DEFAULT_PORT = 1337;

const createServer = (onToken?: (token: us_listen_socket) => void) => {
  const PORT = onToken ? 0 : DEFAULT_PORT;
  ServerConfigService.init(process.env);

  return App().listen(PORT, (token) => {
    if (!token) {
      throw new Error(
        `Failed to listen on port ${us_socket_local_port(token)}`,
      );
    }

    onToken?.(token);
  });
};

const defaultHeaders = (): UndiciHeaders => ({
  'x-forwarded-for': '123',
  'x-api-key': ServerConfigService.getConfig().secrets.server.apiKey,
});

const request = async (
  route: HttpRoute,
  options?: {
    port?: number;
    headers?: UndiciHeaders;
    method?: Dispatcher.HttpMethod;
    body?: string;
  },
) =>
  _request(
    `http://localhost:${options?.port ?? DEFAULT_PORT}${HttpRoutePaths[route]}`,
    {
      headers: options?.headers ?? defaultHeaders(),
      method: options?.method,
      body: options?.body,
    },
  );

export const UwsTestUtils = {
  createServer,
  request,

  defaultHeaders,
  DEFAULT_PORT,
};
