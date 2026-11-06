import { logger } from '../logger/index.js';

const elapsedMs = (start) => Number(process.hrtime.bigint() - start) / 1e6;

export const httpLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsedMs(start).toFixed(1)} ms`);
  });
  next();
};
