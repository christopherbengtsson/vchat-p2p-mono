import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type Cap from '@cap.js/widget';
import type { Maybe } from '@mono/common-dto';
import { CaptchaService } from '../service/CaptchaService';

export const useSolveCaptcha = () => {
  const [isSolving, setIsSolving] = useState(false);

  const solve = useCallback(
    async (cap: Maybe<Cap>): Promise<{ success: boolean }> => {
      const isCaptchaDisabled =
        import.meta.env.VITE_CAPTCHA_ENABLED === 'false';

      setIsSolving(true);

      if (isCaptchaDisabled) {
        console.warn('Captcha is disabled, skipping solving');
        setIsSolving(false);

        return { success: true };
      }

      if (!cap) {
        toast.error('Captcha not initialized');
        setIsSolving(false);

        return { success: false };
      }

      const captchaResult = await CaptchaService.solve(cap);

      if (!captchaResult.success || captchaResult.error) {
        CaptchaService.reset(cap);

        toast.error('Captcha solving failed');
        setIsSolving(false);

        return { success: false };
      }

      const verificationResult = await CaptchaService.verify(
        captchaResult.token,
      );

      if (!verificationResult.success || verificationResult.error) {
        CaptchaService.reset(cap);

        toast.error('Captcha verification failed');
        setIsSolving(false);

        return { success: false };
      }

      setIsSolving(false);
      return { success: true };
    },
    [],
  );

  return {
    solve,
    isSolving,
  };
};
