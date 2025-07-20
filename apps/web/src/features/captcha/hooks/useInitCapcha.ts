import { useCallback, useRef } from 'react';
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

    return () => {
      if (cap.current) {
        CaptchaService.reset(cap.current);
        cap.current = null;
      }
    };
  }, []);

  return {
    cap,
    init,
  };
};
