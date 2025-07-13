import Cap from '@cap.js/widget';
import { CustomError } from '@mono/common-dto';
import { axiosClient } from '@/common/clients/axios';
import { CaptchaResult } from '../model/CaptchaResult';
import { CaptchaVerificationResult } from '../model/CaptchaVerificationResult';

const createCaptchaInstance = (apiEndpoint: string): Cap => {
  return new Cap({
    apiEndpoint,
    workers: navigator.hardwareConcurrency || 2,
  });
};

const solveCaptcha = async (cap: Cap): Promise<CaptchaResult> => {
  try {
    const solution = await cap.solve();

    return {
      token: solution.token,
      success: true,
    };
  } catch (error) {
    return {
      token: '',
      success: false,
      error: error as Error,
    };
  }
};

const resetCaptcha = (cap: Cap): void => {
  try {
    cap.reset();
  } catch (error) {
    console.error('Failed to reset captcha:', error);
  }
};

const verifyCaptchaToken = async (
  token: string,
): Promise<CaptchaVerificationResult> => {
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
    return {
      success: false,
      error: error as Error,
    };
  }
};

export const CaptchaService = {
  createCaptchaInstance,
  solveCaptcha,
  resetCaptcha,
  verifyCaptchaToken,
};
