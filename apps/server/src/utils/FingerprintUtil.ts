import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { DeviceSignature, Fingerprint, Maybe } from '@mono/common-dto';
import logger from './logger.js';

const extractIpFromHeaders = (
  headers: IncomingHttpHeaders,
): string | undefined => {
  const forwardedFor = headers['x-forwarded-for'] as Maybe<string>;
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  logger.warn('X-Forwarded-For header not found');
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
  extractIpFromHeaders,
  generateHash,
  isIdentical,
};
