import { DeviceSignature } from './DeviceSignature.js';

export interface Fingerprint extends DeviceSignature {
  ip: string;
}
