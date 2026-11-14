import winston from 'winston';
import { env } from '../config/env.loader.js';
import { toErrorEntry } from './error-entry.js';
import { baseFormat } from './formats.js';
import { LOG_COLORS, LOG_LEVELS } from './levels.js';
import { createConsoleTransport, createErrorFileTransport } from './transports.js';

const FORCED_EXIT_MS = 3000;

winston.addColors(LOG_COLORS);

// En los tests no se loguea nada: la salida de Mocha queda limpia y no se crean archivos en logs/.
const errorFile = env.isTest ? null : createErrorFileTransport();
const consoleTransport = createConsoleTransport({ colorize: !env.isProduction });

export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: env.logLevel,
  format: baseFormat,
  transports: errorFile ? [consoleTransport, errorFile] : [consoleTransport],
  silent: env.isTest,
  exitOnError: false,
});

export { toErrorEntry };

export const exitWithFatal = (message, error) => {
  if (!errorFile) {
    logger.fatal(...toErrorEntry(message, error));
    process.exit(1);
  }
  errorFile.once('logged', () => errorFile.close());
  errorFile.once('finish', () => process.exit(1));
  logger.fatal(...toErrorEntry(message, error));
  setTimeout(() => process.exit(1), FORCED_EXIT_MS).unref();
};
