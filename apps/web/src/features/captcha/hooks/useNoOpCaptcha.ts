import { useCallback } from 'react';
import { noop } from '@/common/utils/noop';
import { SolveAndVerifyCaptcha } from '../model/SolveAndVerifyCaptcha';

/**
 * No-op captcha implementation for when captcha is disabled
 * Used during development/testing to bypass captcha verification
 */
export const useNoOpCaptcha = () => {
  const solveAndVerifyCaptcha =
    useCallback(async (): Promise<SolveAndVerifyCaptcha> => {
      console.debug('Captcha disabled - bypassing verification');
      return Promise.resolve({ success: true });
    }, []);

  const resetCaptcha = useCallback(() => noop, []);

  return {
    solveAndVerifyCaptcha,
    resetCaptcha,
    captchaLoading: false,
    token: null,
    error: null,
    isReady: true,
  };
};
