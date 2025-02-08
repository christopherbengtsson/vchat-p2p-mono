import type { DeviceSignature } from '@mono/common-dto';
import logger from '../logger.js';
import { FingerprintUtil } from '../FingerprintUtil.js';

const mockDeviceSignature: DeviceSignature = {
  os: 'Windows',
  device: 'desktop',
  screen: '1920x1080',
  language: 'en-US',
  timezone: 'America/New_York',
};

describe('FingerprintUtil', () => {
  describe('extractIpFromHeaders', () => {
    it('should extract first IP from x-forwarded-for header with single IP', () => {
      const result = FingerprintUtil.extractIpFromHeaders({
        'x-forwarded-for': '192.168.1.1',
      });
      expect(result).toEqual('192.168.1.1');
    });

    it('should extract first IP from x-forwarded-for header with multiple IPs', () => {
      const result = FingerprintUtil.extractIpFromHeaders({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
      });
      expect(result).toEqual('192.168.1.1');
    });

    it('should handle IPv6 address in x-forwarded-for header', () => {
      const result = FingerprintUtil.extractIpFromHeaders({
        'x-forwarded-for': '2001:db8:cafe::17',
      });
      expect(result).toEqual('2001:db8:cafe::17');
    });

    it('should return undefined when x-forwarded-for header is missing', () => {
      const result = FingerprintUtil.extractIpFromHeaders({});
      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        '[FingerprintUtil]: X-Forwarded-For header not found',
      );
    });

    it('should return undefined for empty headers', () => {
      const result = FingerprintUtil.extractIpFromHeaders({});
      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        '[FingerprintUtil]: X-Forwarded-For header not found',
      );
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hash for same input', () => {
      const ip = '192.168.1.1';
      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, ip);
      const hash2 = FingerprintUtil.generateHash(mockDeviceSignature, ip);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different IPs', () => {
      const hash1 = FingerprintUtil.generateHash(
        mockDeviceSignature,
        '192.168.1.1',
      );
      const hash2 = FingerprintUtil.generateHash(
        mockDeviceSignature,
        '192.168.1.2',
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different device signatures', () => {
      const ip = '192.168.1.1';
      const differentDeviceSignature = {
        ...mockDeviceSignature,
        browser: 'Firefox',
        os: 'MacOS',
        device: 'Apple',
      };

      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, ip);
      const hash2 = FingerprintUtil.generateHash(differentDeviceSignature, ip);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when screen resolution changes', () => {
      const ip = '192.168.1.1';
      const differentScreen = {
        ...mockDeviceSignature,
        screen: '2560x1440',
      };

      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, ip);
      const hash2 = FingerprintUtil.generateHash(differentScreen, ip);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when timezone changes', () => {
      const ip = '192.168.1.1';
      const differentTimezone = {
        ...mockDeviceSignature,
        timezone: 'Europe/London',
      };

      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, ip);
      const hash2 = FingerprintUtil.generateHash(differentTimezone, ip);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isIdentical', () => {
    const mockIp = '192.168.1.1';

    it('should return true for identical device fingerprints', () => {
      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, mockIp);
      const hash2 = FingerprintUtil.generateHash(mockDeviceSignature, mockIp);
      expect(FingerprintUtil.isIdentical(hash1, hash2)).toBe(true);
    });

    it('should return false for different device fingerprints', () => {
      const differentDeviceSignature = {
        ...mockDeviceSignature,
        browser: 'Firefox',
      };

      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, mockIp);
      const hash2 = FingerprintUtil.generateHash(
        differentDeviceSignature,
        mockIp,
      );
      expect(FingerprintUtil.isIdentical(hash1, hash2)).toBe(false);
    });
    it('should return false for different IPs', () => {
      const differentIpMock = '192.168.1.2';
      const hash1 = FingerprintUtil.generateHash(mockDeviceSignature, mockIp);
      const hash2 = FingerprintUtil.generateHash(
        mockDeviceSignature,
        differentIpMock,
      );
      expect(FingerprintUtil.isIdentical(hash1, hash2)).toBe(false);
    });
  });
});
