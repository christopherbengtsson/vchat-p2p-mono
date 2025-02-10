import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { UAParser } from 'ua-parser-js';
import type {
  BrowserSignature,
  DeviceSignature,
  Fingerprint,
  Maybe,
} from '@mono/common-dto';
import logger from '../utils/logger.js';

const uaFallback = {
  device: {
    model: undefined,
    vendor: undefined,
  },
  os: {
    name: undefined,
  },
} as const;

const getDeviceSignature = (
  browserSignature: BrowserSignature,
  headers: IncomingHttpHeaders,
): DeviceSignature => {
  const uaHeaders = headers['user-agent'];
  const uaData = uaHeaders ? new UAParser(uaHeaders).getResult() : uaFallback;

  if (!uaHeaders) {
    logger.warn('[FingerprintService]: User-Agent header not found');
  }

  return {
    ...browserSignature,
    os: uaData.os.name,
    device: `${uaData.device.model}-${uaData.device.vendor}`,
  };
};

const extractIpFromHeaders = (
  headers: IncomingHttpHeaders,
): string | undefined => {
  const forwardedFor = headers['x-forwarded-for'] as Maybe<string>;
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
};

const generate = (
  browserSignature: BrowserSignature,
  headers: IncomingHttpHeaders,
  requestIp?: string,
) => {
  const deviceSignature = getDeviceSignature(browserSignature, headers);

  const ip = requestIp ?? extractIpFromHeaders(headers);

  if (!ip) {
    logger.warn(
      '[FingerprintService]: X-Forwarded-For header not found, cannot generate fingerprint.',
    );
    return undefined;
  }

  const fingerprint: Fingerprint = {
    ...deviceSignature,
    ip,
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
};

export const FingerprintService = {
  generate,
};
