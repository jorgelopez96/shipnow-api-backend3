import dotenv from 'dotenv';
import { LOG_LEVEL_NAMES } from '../logger/levels.js';

dotenv.config({ quiet: true });

const NODE_ENVS = ['development', 'production'];
const DEFAULT_PORT = 8080;

const { MONGODB_URI, NODE_ENV, PORT, LOG_LEVEL } = process.env;
const envErrors = [];

const readPort = () => {
  if (PORT === undefined || PORT === '') return DEFAULT_PORT;
  const port = Number(PORT);
  if (Number.isInteger(port) && port >= 1 && port <= 65535) return port;
  envErrors.push(`PORT debe ser un entero entre 1 y 65535 (llegó "${PORT}")`);
  return DEFAULT_PORT;
};

const readLogLevel = () => {
  const defaultLevel = NODE_ENV === 'development' ? 'debug' : 'info';
  if (LOG_LEVEL === undefined || LOG_LEVEL === '') return defaultLevel;
  if (LOG_LEVEL_NAMES.includes(LOG_LEVEL)) return LOG_LEVEL;
  envErrors.push(`LOG_LEVEL debe ser uno de ${LOG_LEVEL_NAMES.join(', ')} (llegó "${LOG_LEVEL}")`);
  return defaultLevel;
};

if (!MONGODB_URI) envErrors.push('falta MONGODB_URI');
if (!NODE_ENV) envErrors.push('falta NODE_ENV');
if (NODE_ENV && !NODE_ENVS.includes(NODE_ENV)) {
  envErrors.push(`NODE_ENV debe ser ${NODE_ENVS.join(' o ')} (llegó "${NODE_ENV}")`);
}

export const env = Object.freeze({
  port: readPort(),
  mongoUri: MONGODB_URI,
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  logLevel: readLogLevel(),
});

export { envErrors };
