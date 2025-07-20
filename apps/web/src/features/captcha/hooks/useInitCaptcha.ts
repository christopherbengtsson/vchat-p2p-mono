import { useCallback, useEffect, useRef } from 'react';
import type Cap from '@cap.js/widget';
import { CaptchaService } from '../service/CaptchaService';

export const useInitCaptcha = () => {
  const cap = useRef<Cap>(null);

  const init = useCallback(() => {
    const isCaptchaDisabled = import.meta.env.VITE_CAPTCHA_ENABLED === 'false';

    if (isCaptchaDisabled) {
      return;
    }

    cap.current = CaptchaService.init();
  }, []);

  const reset = useCallback(() => {
    if (cap.current) {
      CaptchaService.reset(cap.current);
      cap.current = null;

      document.querySelectorAll('cap-widget').forEach((el) => {
        el.remove();
      });
    }
  }, []);

  useEffect(() => {
    init();

    return () => {
      reset();
    };
  }, [init, reset]);

  return cap;
};
