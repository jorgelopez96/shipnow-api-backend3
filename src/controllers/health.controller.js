import { config } from '../config/index.js';
import { isMongoConnected } from '../database/mongo-connection.js';
import { AppError } from '../errors/app-error.js';
import { sendSuccess } from '../utils/send-success.js';

// Solo lo necesario para monitorear: nada de versiones, URIs, rutas del servidor ni variables de entorno.
// Sin MongoDB responde 503, así el HEALTHCHECK de Docker marca el contenedor como unhealthy.
export const healthController = {
  check(req, res, next) {
    if (!isMongoConnected()) return next(new AppError('DATABASE_UNAVAILABLE'));

    sendSuccess(res, {
      status: 'ok',
      environment: config.nodeEnv,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  },
};
