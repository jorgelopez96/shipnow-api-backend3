import { logger } from '../logger/index.js';
import { LOG_LEVEL_NAMES } from '../logger/levels.js';
import { sendSuccess } from '../utils/send-success.js';

export const loggerTestController = {
  generateLogs(req, res) {
    for (const level of [...LOG_LEVEL_NAMES].reverse()) {
      logger.log(level, `Prueba de logger: mensaje de nivel ${level}`);
    }
    sendSuccess(res, { message: 'Logs generados correctamente' });
  },
};
