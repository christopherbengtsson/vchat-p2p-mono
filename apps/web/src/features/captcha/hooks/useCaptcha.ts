import { useCallback, useEffect, useRef, useState } from 'react';
import Cap from '@cap.js/widget';
import { CustomError } from '@mono/common-dto';
import { CaptchaService } from '../service/CaptchaService';
import { SolveAndVerifyCaptcha } from '../model/SolveAndVerifyCaptcha';
import { CaptchaResult } from '../model/CaptchaResult';
import { useNoOpCaptcha } from './useNoOpCaptcha';

interface CaptchaState {
  captchaLoading: boolean;
  token: string | null;
  error: Error | null;
  isReady: boolean;
}

interface CaptchaOptions {
  apiEndpoint?: string;
  enabled?: boolean;
}

const INITIAL_STATE: CaptchaState = {
  captchaLoading: false,
  token: null,
  error: null,
  isReady: false,
};

export const useCaptcha = (options: CaptchaOptions = {}) => {
  const {
    enabled = import.meta.env.VITE_CAPTCHA_ENABLED !== 'false',
    apiEndpoint = import.meta.env.DEV
      ? `http://localhost:8001/api/v1/captcha/${import.meta.env.VITE_CAP_SITE_KEY}/`
      : `${import.meta.env.VITE_SERVER_URL}/api/v1/captcha/${import.meta.env.VITE_CAP_SITE_KEY}/`,
  } = options;

  const [state, setState] = useState<CaptchaState>(INITIAL_STATE);
  const capInstanceRef = useRef<Cap | null>(null);
  const noOpCaptcha = useNoOpCaptcha();

  const initializeCaptcha = useCallback(() => {
    if (!enabled) return;

    try {
      if (capInstanceRef.current) {
        console.warn('Captcha instance already initialized');
        return;
      }

      console.debug('Initializing captcha instance');

      capInstanceRef.current =
        CaptchaService.createCaptchaInstance(apiEndpoint);

      setState((prevState) => ({
        ...prevState,
        isReady: true,
        error: null,
      }));
    } catch (error) {
      console.error('Error initializing captcha instance:', error);
      setState((prevState) => ({
        ...prevState,
        error: error as Error,
        isReady: false,
      }));
    }
  }, [apiEndpoint, enabled]);

  const cleanupCaptcha = useCallback(() => {
    if (capInstanceRef.current) {
      try {
        CaptchaService.resetCaptcha(capInstanceRef.current);
        capInstanceRef.current = null;

        setState((prevState) => ({
          ...prevState,
          isReady: false,
          token: null,
          error: null,
        }));
      } catch (error) {
        console.error('Error cleaning up captcha instance:', error);
      }
    }
  }, []);

  const solveCaptcha = useCallback(async (): Promise<CaptchaResult> => {
    if (!capInstanceRef.current) {
      const errorResult: CaptchaResult = {
        token: '',
        success: false,
        error: CustomError.badState('Captcha not initialized'),
      };
      setState((prevState) => ({
        ...prevState,
        error: errorResult.error || null,
      }));

      return errorResult;
    }

    try {
      const result = await CaptchaService.solveCaptcha(capInstanceRef.current);

      setState((prevState) => ({
        ...prevState,
        token: result.success ? result.token : null,
        error: result.error || null,
      }));

      return result;
    } catch (error) {
      const errorResult: CaptchaResult = {
        token: '',
        success: false,
        error: error as Error,
      };

      setState((prevState) => ({
        ...prevState,
        error: errorResult.error || null,
      }));

      return errorResult;
    }
  }, []);

  const resetCaptcha = useCallback(() => {
    if (capInstanceRef.current) {
      CaptchaService.resetCaptcha(capInstanceRef.current);
    }

    setState((prevState) => ({
      ...prevState,
      token: null,
      error: null,
    }));
  }, []);

  const solveAndVerifyCaptcha =
    useCallback(async (): Promise<SolveAndVerifyCaptcha> => {
      if (!state.isReady) {
        return {
          success: false,
          errorMessage: 'Security verification not ready, please try again',
        };
      }

      setState((prevState) => ({
        ...prevState,
        captchaLoading: true,
        error: null,
      }));

      try {
        const captchaResult = await solveCaptcha();

        if (!captchaResult.success) {
          setState((prevState) => ({
            ...prevState,
            captchaLoading: false,
            error: captchaResult.error || null,
          }));

          return {
            success: false,
            errorMessage: 'Security verification failed, please try again',
          };
        }

        const verificationResult = await CaptchaService.verifyCaptchaToken(
          captchaResult.token,
        );

        if (!verificationResult.success) {
          setState((prevState) => ({
            ...prevState,
            captchaLoading: false,
            error: verificationResult.error || null,
          }));

          return {
            success: false,
            errorMessage: 'Security verification failed, please try again',
          };
        }

        setState((prevState) => ({
          ...prevState,
          captchaLoading: false,
          error: null,
        }));

        return { success: true };
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          captchaLoading: false,
          error: error as Error,
        }));

        return {
          success: false,
          errorMessage: 'Security verification failed, please try again',
        };
      }
    }, [solveCaptcha, state.isReady]);

  useEffect(() => {
    if (enabled) {
      initializeCaptcha();
    }

    return () => {
      cleanupCaptcha();
    };
  }, [initializeCaptcha, enabled, cleanupCaptcha]);

  if (!enabled) {
    return noOpCaptcha;
  }

  return {
    ...state,
    solveAndVerifyCaptcha,
    resetCaptcha,
  };
};
