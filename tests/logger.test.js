import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { logger } from '../src/logger/index.js';
import { LOG_LEVEL_NAMES } from '../src/logger/levels.js';
import { expectSuccess } from './helpers.js';

describe('Logger API', () => {
  describe('GET /api/loggerTest', () => {
    it('debería responder que los logs se generaron', async () => {
      const payload = expectSuccess(await request(app).get('/api/loggerTest'));
      expect(payload).to.deep.equal({ message: 'Logs generados correctamente' });
    });

    it('debería escribir un mensaje de cada nivel, del menos al más grave', async () => {
      const calls = [];
      const originalLog = logger.log;
      logger.log = function (level, message, ...rest) {
        if (String(message).startsWith('Prueba de logger')) calls.push({ level, message });
        return originalLog.call(this, level, message, ...rest);
      };
      try {
        await request(app).get('/api/loggerTest');
      } finally {
        logger.log = originalLog;
      }
      const levels = [...LOG_LEVEL_NAMES].reverse();
      expect(calls).to.deep.equal(levels.map((level) => ({ level, message: `Prueba de logger: mensaje de nivel ${level}` })));
    });
  });
});
