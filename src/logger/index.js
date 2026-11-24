import winston from 'winston';
import { env } from '../config/env.loader.js';
import { toErrorEntry } from './error-entry.js';
import { baseFormat } from './formats.js';
import { LOG_COLORS, LOG_LEVELS } from './levels.js';
import { createConsoleTransport, createFileTransport } from './transports.js';

const FORCED_EXIT_MS = 3000;

winston.addColors(LOG_COLORS);

// error.log guarda solo error y fatal; combined.log, toda la actividad desde LOG_LEVEL.
// En los tests no se loguea nada: la salida de Mocha queda limpia y no se crean archivos en logs/.
const files = env.isTest ? [] : [createFileTransport('error.log', 'error'), createFileTransport('combined.log')];

// La consola es solo para desarrollo (en los tests queda en silencio). En producción todo va a los archivos.
const transports = env.isProduction ? files : [createConsoleTransport(), ...files];

export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: env.logLevel,
  format: baseFormat,
  transports,
  silent: env.isTest,
  exitOnError: false,
});

export { toErrorEntry };

// Espera a que el fatal quede escrito en los dos archivos antes de salir; si no, la última línea se pierde.
export const exitWithFatal = (message, error) => {
  // Si Node termina solo al cerrar los archivos, igual sale con error.
  process.exitCode = 1;
  if (files.length === 0) {
    logger.fatal(...toErrorEntry(message, error));
    process.exit(1);
  }
  let pending = files.length;
  for (const file of files) {
    file.once('logged', () => file.close());
    file.once('finish', () => --pending === 0 && process.exit(1));
  }
  logger.fatal(...toErrorEntry(message, error));
  setTimeout(() => process.exit(1), FORCED_EXIT_MS).unref();
};
