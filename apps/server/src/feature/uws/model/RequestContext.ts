import type { Maybe } from '@mono/common-dto';
import type { SafeResponse } from './SafeResponse.js';

export interface RequestContext {
  res: SafeResponse;
  headers: Record<string, string>;
  ip: Maybe<string>;
  query: Record<string, string>;
  method: string;
  url: string;
}
