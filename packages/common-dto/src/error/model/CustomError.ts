import isError from 'lodash.iserror';
import { CustomErrorType } from './CustomErrorType.js';

type UnknownError = unknown;

export class CustomError extends Error {
  static isCustomError(error: unknown): error is CustomError {
    return error instanceof CustomError;
  }

  static fromError = (error: unknown): CustomError =>
    CustomError.isCustomError(error)
      ? error
      : CustomError.internal(isError(error) ? error.message : String(error));

  static unauthorized(message?: string): CustomError {
    return new CustomError(CustomErrorType.UNAUTHORIZED, message);
  }

  static notFound(message?: string): CustomError {
    return new CustomError(CustomErrorType.NOT_FOUND, message);
  }

  static gone(message?: string): CustomError {
    return new CustomError(CustomErrorType.GONE, message);
  }

  static badState(message?: string): CustomError {
    return new CustomError(CustomErrorType.BAD_STATE, message);
  }

  static badRequest(message?: string): CustomError {
    return new CustomError(CustomErrorType.BAD_REQUEST, message);
  }

  static conflict(message?: string): CustomError {
    return new CustomError(CustomErrorType.CONFLICT, message);
  }

  static internal(message?: string): CustomError {
    return new CustomError(CustomErrorType.SERVER_ERROR, message);
  }

  static unhandledClientError(message?: string): CustomError {
    return new CustomError(CustomErrorType.UNHANDLED_CLIENT_ERROR, message);
  }

  static forbidden(message?: string): CustomError {
    return new CustomError(CustomErrorType.FORBIDDEN, message);
  }

  static cancelled(message?: string): CustomError {
    return new CustomError(CustomErrorType.CANCELLED, message);
  }

  static timeout(message?: string): CustomError {
    return new CustomError(CustomErrorType.TIMEOUT, message);
  }

  static tooManyRequests(message?: string): CustomError {
    return new CustomError(CustomErrorType.TOO_MANY_REQUESTS, message);
  }

  static authenticationFailed(message?: string): CustomError {
    return new CustomError(CustomErrorType.AUTHENTICATION_FAILED, message);
  }

  static httpCommunication(message?: string): CustomError {
    return new CustomError(CustomErrorType.HTTP_COMMUNICATION, message);
  }

  // These methods safely checks the error type of unknown error.

  static isErrorOfType(
    error: UnknownError,
    errorType: CustomErrorType,
  ): error is CustomError {
    return this.isCustomError(error) && error.type === errorType;
  }

  static isUnauthorized(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.UNAUTHORIZED);
  }

  static isAuthenticationFailed(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.AUTHENTICATION_FAILED);
  }

  static isNotFound(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.NOT_FOUND);
  }

  static isGone(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.GONE);
  }

  static isBadState(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.BAD_STATE);
  }

  static isBadRequest(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.BAD_REQUEST);
  }

  static isConflict(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.CONFLICT);
  }

  static isServerError(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.SERVER_ERROR);
  }

  static isExpired(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.EXPIRED);
  }

  static isMalformed(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.MALFORMED);
  }

  static isForbidden(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.FORBIDDEN);
  }

  static isHttpCommunication(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.HTTP_COMMUNICATION);
  }

  static isCancelled(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.CANCELLED);
  }

  static isTimeout(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.TIMEOUT);
  }

  static isTooManyRequests(error: UnknownError): error is CustomError {
    return this.isErrorOfType(error, CustomErrorType.TOO_MANY_REQUESTS);
  }

  type: CustomErrorType;

  constructor(type: CustomErrorType, message?: string) {
    super(message);
    this.type = type;

    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
