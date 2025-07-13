import { CaptchaVerificationResult } from './CaptchaVerificationResult';

export interface CaptchaResult extends CaptchaVerificationResult {
  token: string;
}
