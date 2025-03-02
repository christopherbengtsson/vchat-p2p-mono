import type { Observables } from './Observables.js';
import type { Setters } from './Setters.js';
import type { Callbacks } from './CallBacks.js';

export interface WebRTCParams {
  observables: Observables;
  setters: Setters;
  callbacks: Callbacks;
}
