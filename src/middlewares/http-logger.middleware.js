import { randomUUID } from 'node:crypto';
import { logger } from '../logger/index.js';
import { requestContext } from '../logger/request-context.js';

// Si el cliente manda su propio X-Request-Id se respeta, pero solo con un formato seguro para escribirlo en los logs.
const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

const elapsedMs = (start) => Number(process.hrtime.bigint() - start) / 1e6;

export const httpLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const received = req.get('x-request-id');
  const requestId = received && VALID_REQUEST_ID.test(received) ? received : randomUUID();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsedMs(start).toFixed(1)} ms`, { requestId });
  });
  requestContext.run({ requestId }, next);
};
