import { format } from 'winston';
import { redactSensitive } from './redact-sensitive.format.js';
import { currentRequestId } from './request-context.js';

const { combine, colorize, errors, printf, timestamp } = format;

const addRequestId = format((info) => {
  const requestId = info.requestId ?? currentRequestId();
  if (requestId) info.requestId = requestId;
  return info;
});

const toLine = printf(({ timestamp: time, level, message, stack, requestId, ...meta }) => {
  const request = requestId ? ` [${requestId}]` : '';
  const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const trace = stack ? `\n${stack}` : '';
  return `${time} [${level}]${request} ${message}${metadata}${trace}`;
});

export const baseFormat = combine(
  errors({ stack: true }),
  addRequestId(),
  redactSensitive(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
);

export const plainLineFormat = toLine;

export const coloredLineFormat = combine(colorize(), toLine);
