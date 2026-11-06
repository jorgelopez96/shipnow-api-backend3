import { fileURLToPath } from 'node:url';
import { transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { coloredLineFormat, plainLineFormat } from './formats.js';

export const LOGS_DIR = fileURLToPath(new URL('../../logs', import.meta.url));

export const createConsoleTransport = ({ colorize }) =>
  new transports.Console({ format: colorize ? coloredLineFormat : plainLineFormat });

export const createErrorFileTransport = () =>
  new DailyRotateFile({
    dirname: LOGS_DIR,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: plainLineFormat,
  });
