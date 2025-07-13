import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { UAParser } from 'ua-parser-js';
import type {
  BrowserSignature,
  DeviceSignature,
  Fingerprint,
} from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import { HeadersUtil } from '../../../common/util/HeadersUtil.js';

const uaFallback = {
  device: {
    model: undefined,
    vendor: undefined,
  },
  os: {
    name: undefined,
  },
} as const;

/**
 * Generates a device signature by combining browser-provided signature with OS and device details from User-Agent.
 * @param browserSignature The signature provided by the browser.
 * @param headers Incoming HTTP headers from the request.
 * @returns A device signature object.
 */
const getDeviceSignature = (
  browserSignature: BrowserSignature,
  headers: IncomingHttpHeaders,
): DeviceSignature => {
  const uaHeaders = headers['user-agent'];
  const uaData = uaHeaders ? new UAParser(uaHeaders).getResult() : uaFallback;

  if (!uaHeaders) {
    log.warn(
      '[FingerprintService]: User-Agent header not found, using fallback for device signature.',
    );
  }

  return {
    ...browserSignature,
    os: uaData.os.name,
    device: `${uaData.device.model}-${uaData.device.vendor}`, // Combine model and vendor for device identifier.
  };
};

/**
 * Generates a unique fingerprint string based on browser signature, device signature, and IP address.
 * @param browserSignature The signature provided by the browser.
 * @param headers Incoming HTTP headers from the request.
 * @param requestIp Optional: The request IP, typically from req.ip in Express.
 * @returns A SHA256 hash representing the fingerprint, or undefined if IP address cannot be determined.
 */
const generate = (
  browserSignature: BrowserSignature,
  headers: IncomingHttpHeaders,
  requestIp?: string,
): string | undefined => {
  const deviceSignature = getDeviceSignature(browserSignature, headers);

  // Use requestIp if provided (e.g., from Express req.ip), otherwise try to extract from headers.
  const ip = requestIp ?? HeadersUtil.extractIpFromHeaders(headers);

  if (!ip) {
    log.warn(
      '[FingerprintService]: IP address could not be determined (requestIp and x-forwarded-for are missing), cannot generate fingerprint.',
    );
    return undefined;
  }

  // Combine all parts into a single object for hashing.
  const fingerprint: Fingerprint = {
    ...deviceSignature,
    ip,
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
};

export const FingerprintService = {
  generate,
};
