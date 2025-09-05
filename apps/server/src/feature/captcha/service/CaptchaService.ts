import { CustomError, CustomErrorType } from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { CaptchaMetricsService } from './CaptchaMetricsService.js';

interface CaptchaVerificationRequest {
  secret: string;
  response: string;
}

interface CaptchaVerificationResponse {
  success: boolean;
}

const verifyCaptchaToken = async (
  ip: string,
  token: string,
): Promise<boolean> => {
  const startTime = performance.now();

  try {
    const serverConfig = ServerConfigService.getConfig();
    const captchaBaseUrl = serverConfig.secrets.capServer.baseUrl;
    const captchaSiteKey = serverConfig.secrets.capServer.siteKey;

    const verifyEndpoint = `${captchaBaseUrl}/${captchaSiteKey}/siteverify`;

    const payload: CaptchaVerificationRequest = {
      secret: serverConfig.secrets.capServer.secretKey,
      response: token,
    };

    const response = await fetch(verifyEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const duration = (performance.now() - startTime) / 1000;
      CaptchaMetricsService.recordVerificationDuration(duration);
      CaptchaMetricsService.recordVerificationFailure('http_error');

      log.error('Cap.js verification request failed');
      throw new CustomError(
        CustomErrorType.BAD_REQUEST,
        `Captcha verification request failed: ${response.status}`,
      );
    }

    const result: CaptchaVerificationResponse = await response.json();
    const duration = (performance.now() - startTime) / 1000;

    CaptchaMetricsService.recordVerificationDuration(duration);

    if (result.success) {
      CaptchaMetricsService.recordVerificationSuccess();
    } else {
      CaptchaMetricsService.recordVerificationFailure('invalid_token');
    }

    return result.success;
  } catch (error) {
    const duration = (performance.now() - startTime) / 1000;
    CaptchaMetricsService.recordVerificationDuration(duration);

    if (!(error instanceof CustomError)) {
      CaptchaMetricsService.recordVerificationFailure('network_error');
    }

    log.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      'Error verifying captcha token',
    );

    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(
      CustomErrorType.SERVER_ERROR,
      'Failed to verify captcha token',
    );
  }
};

export const CaptchaService = {
  verifyCaptchaToken,
};
