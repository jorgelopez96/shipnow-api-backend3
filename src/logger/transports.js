import { fileURLToPath } from 'node:url';
import { transports } from 'winston';
import { coloredLineFormat, plainLineFormat } from './formats.js';

export const LOGS_DIR = fileURLToPath(new URL('../../logs', import.meta.url));

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 5;

export const createConsoleTransport = () => new transports.Console({ format: coloredLineFormat });

// Rota por tamaño: el archivo actual siempre se llama igual (error.log, combined.log) y los viejos pasan a error1.log, error2.log...
// Sin level, el archivo usa el nivel del logger (LOG_LEVEL).
export const createFileTransport = (filename, level) =>
  new transports.File({
    dirname: LOGS_DIR,
    filename,
    level,
    maxsize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    tailable: true,
    format: plainLineFormat,
  });
