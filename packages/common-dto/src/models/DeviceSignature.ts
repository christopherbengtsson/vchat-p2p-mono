import { BrowserSignature } from './BrowserSignature.js';
import { Maybe } from './Maybe.js';

export interface DeviceSignature extends BrowserSignature {
  device: Maybe<string>;
  os: Maybe<string>;
}
