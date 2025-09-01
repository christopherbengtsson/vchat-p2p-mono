import type { HttpResponse } from 'uWebSockets.js';

export interface SafeResponse extends HttpResponse {
  done?: boolean;
  aborted?: boolean;
}
