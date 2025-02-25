import type { Maybe } from '@mono/common-dto';
import type { Observables } from './Observables.js';
import type { Setters } from './Setters.js';
import type { Callbacks } from './CallBacks.js';
import type { Injectables } from './Injectables.js';

export interface WebRTCParams {
  observables: Observables;
  setters: Setters;
  callbacks: Callbacks;
  injectables: Maybe<Injectables>;
}
