import { Maybe } from '../../monad/model/Maybe.js';
import { BrowserSignature } from './BrowserSignature.js';

export interface DeviceSignature extends BrowserSignature {
  device: Maybe<string>;
  os: Maybe<string>;
}
