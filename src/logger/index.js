import winston from 'winston';
import { env } from '../config/env.loader.js';
import { toErrorEntry } from './error-entry.js';
import { baseFormat } from './formats.js';
import { LOG_COLORS, LOG_LEVELS } from './levels.js';
import { createConsoleTransport, createErrorFileTransport } from './transports.js';

const FORCED_EXIT_MS = 3000;

winston.addColors(LOG_COLORS);

const errorFile = createErrorFileTransport();

export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: env.logLevel,
  format: baseFormat,
  transports: [createConsoleTransport({ colorize: !env.isProduction }), errorFile],
  exitOnError: false,
});

export { toErrorEntry };

export const exitWithFatal = (message, error) => {
  errorFile.once('logged', () => errorFile.close());
  errorFile.once('finish', () => process.exit(1));
  logger.fatal(...toErrorEntry(message, error));
  setTimeout(() => process.exit(1), FORCED_EXIT_MS).unref();
};
