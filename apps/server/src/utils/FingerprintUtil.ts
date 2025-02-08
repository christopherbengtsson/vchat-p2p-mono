import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { UAParser } from 'ua-parser-js';
import type {
  BrowserSignature,
  DeviceSignature,
  Fingerprint,
  Maybe,
} from '@mono/common-dto';
import logger from './logger.js';

const uaFallback = {
  device: {
    model: undefined,
    vendor: undefined,
  },
  os: {
    name: undefined,
  },
};

const getDeviceSignature = (
  browserSignature: BrowserSignature,
  headers: IncomingHttpHeaders,
): DeviceSignature => {
  const uaHeaders = headers['user-agent'];
  const uaData = uaHeaders ? new UAParser(uaHeaders).getResult() : uaFallback;

  if (!uaHeaders) {
    logger.warn('[FingerprintUtil]: User-Agent header not found');
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

  logger.warn('[FingerprintUtil]: X-Forwarded-For header not found');
  return undefined;
};

const generateHash = (deviceSignature: DeviceSignature, ip: string) => {
  const fingerprint: Fingerprint = {
    ...deviceSignature,
    ip,
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
};

const isIdentical = (f1: string, f2: string) => f1 === f2;

export const FingerprintUtil = {
  getDeviceSignature,
  extractIpFromHeaders,
  generateHash,
  isIdentical,
};
