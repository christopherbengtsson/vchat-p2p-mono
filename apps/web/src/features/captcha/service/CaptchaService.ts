import Cap from '@cap.js/widget';
import { CustomError } from '@mono/common-dto';
import { axiosClient } from '@/common/clients/axios';
import { CaptchaResult } from '../model/CaptchaResult';
import { CaptchaVerificationResult } from '../model/CaptchaVerificationResult';

const init = (): Cap => {
  return new Cap({
    apiEndpoint: `${import.meta.env.VITE_CAPTCHA_SERVER_URL}/${import.meta.env.VITE_CAP_SITE_KEY}/`,
    workers: navigator.hardwareConcurrency || 2,
  });
};

const solve = async (cap: Cap): Promise<CaptchaResult> => {
  try {
    const solution = await cap.solve();

    return {
      token: solution.token,
      success: true,
    };
  } catch (error) {
    console.error('Captcha solve error:', error);

    return {
      token: '',
      success: false,
      error: error as Error,
    };
  }
};

const reset = (cap: Cap): void => {
  try {
    cap.reset();
  } catch (error) {
    console.error('Failed to reset captcha:', error);
  }
};

const verify = async (token: string): Promise<CaptchaVerificationResult> => {
  try {
    const { data } = await axiosClient.post<{ success: boolean }>(
      '/captcha/verify',
      {
        token,
      },
    );

    return {
      success: data.success ?? false,
      error: data.success
        ? undefined
        : CustomError.badState('Captcha verification failed'),
    };
  } catch (error) {
    console.error('Captcha verification error:', error);

    return {
      success: false,
      error: error as Error,
    };
  }
};

export const CaptchaService = {
  init,
  solve,
  reset,
  verify,
};
