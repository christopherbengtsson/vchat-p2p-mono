import { CustomError, CustomErrorType } from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';

interface CaptchaVerificationRequest {
  secret: string;
  response: string;
}

interface CaptchaVerificationResponse {
  success: boolean;
}

const verifyCaptchaToken = async (token: string): Promise<boolean> => {
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      log.error(
        {
          status: response.status,
          statusText: response.statusText,
        },
        'Cap.js verification request failed',
      );
      throw new CustomError(
        CustomErrorType.BAD_REQUEST,
        `Captcha verification request failed: ${response.status}`,
      );
    }

    const result: CaptchaVerificationResponse = await response.json();

    log.info({ success: result.success }, 'Captcha verification result');

    return result.success;
  } catch (error) {
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
