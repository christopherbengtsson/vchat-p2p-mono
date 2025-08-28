import type { IncomingHttpHeaders } from 'node:http';
import type { Maybe } from '@mono/common-dto';

/**
 * Extracts the client's IP address from the 'x-forwarded-for' header.
 * @param headers Incoming HTTP headers from the request.
 * @returns The extracted IP address or undefined if the header is not present.
 */
const extractIpFromHeaders = (
  headers: IncomingHttpHeaders,
): string | undefined => {
  const forwardedFor = headers['x-forwarded-for'] as Maybe<string>;
  if (forwardedFor) {
    // The 'x-forwarded-for' header can contain a list of IPs; the first one is usually the client's.
    return forwardedFor.split(',')[0].trim();
  }

  return undefined;
};

export const HeadersUtil = {
  extractIpFromHeaders,
};
