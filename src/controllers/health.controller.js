import { config } from '../config/index.js';
import { isMongoConnected } from '../database/mongo-connection.js';
import { sendSuccess } from '../utils/send-success.js';

// Solo lo necesario para monitorear: nada de versiones, URIs, rutas del servidor ni variables de entorno.
export const healthController = {
  check(req, res) {
    sendSuccess(res, {
      status: 'ok',
      environment: config.nodeEnv,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: isMongoConnected() ? 'connected' : 'disconnected',
    });
  },
};
