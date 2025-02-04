import { Maybe } from './Maybe.js';

export interface DeviceSignature {
  ua: Maybe<string>;
  browser: Maybe<string>;
  cpu: Maybe<string>;
  device: Maybe<string>;
  engine: Maybe<string>;
  os: Maybe<string>;
  screen: string;
  language: string;
  timezone: string;
}
