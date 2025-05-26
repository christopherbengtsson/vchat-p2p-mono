import type { IncomingHttpHeaders } from 'http';
import type { DeviceSignature } from '@mono/common-dto';
import { FingerprintService } from '../FingerprintService.js';

const mockIpHeaders: IncomingHttpHeaders = {
  'x-forwarded-for': '192.168.1.1',
};

const mockDeviceSignature: DeviceSignature = {
  os: 'Windows',
  device: 'desktop',
  screen: '1920x1080',
  language: 'en-US',
  timezone: 'America/New_York',
};

describe('FingerprintService', () => {
  describe('generate', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders,
      );
      const hash2 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders,
      );
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different IPs', () => {
      const mockIpHeaders2: IncomingHttpHeaders = {
        'x-forwarded-for': '192.168.1.2',
      };
      const hash1 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders,
      );
      const hash2 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders2,
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different device signatures', () => {
      const differentDeviceSignature = {
        ...mockDeviceSignature,
        browser: 'Firefox',
        os: 'MacOS',
        device: 'Apple',
      };

      const hash1 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders,
      );
      const hash2 = FingerprintService.generate(
        differentDeviceSignature,
        mockIpHeaders,
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when screen resolution changes', () => {
      const headers: IncomingHttpHeaders = {
        'x-forwarded-for': '192.168.1.1',
      };
      const differentScreen = {
        ...mockDeviceSignature,
        screen: '2560x1440',
      };

      const hash1 = FingerprintService.generate(mockDeviceSignature, headers);
      const hash2 = FingerprintService.generate(differentScreen, headers);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes when timezone changes', () => {
      const differentTimezone = {
        ...mockDeviceSignature,
        timezone: 'Europe/London',
      };

      const hash1 = FingerprintService.generate(
        mockDeviceSignature,
        mockIpHeaders,
      );
      const hash2 = FingerprintService.generate(
        differentTimezone,
        mockIpHeaders,
      );
      expect(hash1).not.toBe(hash2);
    });
  });
});
