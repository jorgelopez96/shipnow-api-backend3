import { ERRORS } from './error-dictionary.js';

export class AppError extends Error {
  constructor(code, { message, details, cause } = {}) {
    const definition = ERRORS[code] ?? ERRORS.INTERNAL_SERVER_ERROR;
    super(message ?? definition.message, { cause });
    this.name = 'AppError';
    this.code = ERRORS[code] ? code : 'INTERNAL_SERVER_ERROR';
    this.statusCode = definition.statusCode;
    this.details = details;
  }
}
