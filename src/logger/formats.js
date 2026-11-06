import { format } from 'winston';
import { redactSensitive } from './redact-sensitive.format.js';

const { combine, colorize, errors, printf, timestamp } = format;

const toLine = printf(({ timestamp: time, level, message, stack, ...meta }) => {
  const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const trace = stack ? `\n${stack}` : '';
  return `${time} [${level}] ${message}${metadata}${trace}`;
});

export const baseFormat = combine(errors({ stack: true }), redactSensitive(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }));

export const plainLineFormat = toLine;

export const coloredLineFormat = combine(colorize(), toLine);
