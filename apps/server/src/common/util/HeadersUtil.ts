import type { IncomingHttpHeaders } from 'node:http';

/**
 * Extracts the client's IP address from the 'x-forwarded-for' header.
 * Supports both uWebSockets.js (Record<string, string>) and Socket.IO (IncomingHttpHeaders) formats.
 * @param headers HTTP headers from the request.
 * @returns The extracted IP address or undefined if the header is not present.
 */
const extractIpFromHeaders = (
  headers: Record<string, string> | IncomingHttpHeaders,
): string | undefined => {
  const forwardedFor = headers['x-forwarded-for'];

  // Handle uWebSockets.js format (string) and Socket.IO format (string | string[] | undefined)
  if (typeof forwardedFor === 'string') {
    // The 'x-forwarded-for' header can contain a list of IPs; the first one is usually the client's.
    return forwardedFor.split(',')[0].trim();
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    // Socket.IO/Express can provide arrays for duplicate headers
    return forwardedFor[0].split(',')[0].trim();
  }

  return undefined;
};

export const HeadersUtil = {
  extractIpFromHeaders,
};
