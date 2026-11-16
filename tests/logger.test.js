import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { logger } from '../src/logger/index.js';
import { LOG_LEVEL_NAMES } from '../src/logger/levels.js';
import { currentRequestId } from '../src/logger/request-context.js';
import { createUser, expectSuccess, ORDER_ITEMS, PDF_FILE } from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Anota el request-id que ve cada logger.info mientras corre la petición.
const requestIdsLoggedDuring = async (sendRequest) => {
  const seen = [];
  const originalInfo = logger.info;
  logger.info = function (...args) {
    seen.push(currentRequestId());
    return originalInfo.apply(this, args);
  };
  try {
    const res = await sendRequest();
    return { res, seen };
  } finally {
    logger.info = originalInfo;
  }
};

describe('Request-id', () => {
  it('debería generar un X-Request-Id distinto para cada petición', async () => {
    const [first, second] = await Promise.all([request(app).get('/api/products'), request(app).get('/api/products')]);
    expect(first.headers['x-request-id']).to.match(UUID);
    expect(second.headers['x-request-id']).to.match(UUID);
    expect(first.headers['x-request-id']).to.not.equal(second.headers['x-request-id']);
  });

  it('debería respetar el X-Request-Id que manda el cliente', async () => {
    const res = await request(app).get('/api/products').set('X-Request-Id', 'pedido-123');
    expect(res.headers['x-request-id']).to.equal('pedido-123');
  });

  it('debería reemplazar un X-Request-Id con caracteres no permitidos', async () => {
    const res = await request(app).get('/api/products').set('X-Request-Id', 'abc def;inyectado');
    expect(res.headers['x-request-id']).to.match(UUID);
  });

  it('debería llegar al log del service en una petición con body JSON', async () => {
    const customer = await createUser();
    const { res, seen } = await requestIdsLoggedDuring(() =>
      request(app).post('/api/orders').send({ customer: customer._id, items: ORDER_ITEMS, deliveryAddress: 'Calle 1' })
    );
    expectSuccess(res, 201);
    expect(seen).to.deep.equal([res.headers['x-request-id']]);
  });

  it('debería llegar al log del service en una subida de archivo con Multer', async () => {
    const user = await createUser();
    const { res, seen } = await requestIdsLoggedDuring(() =>
      request(app).post(`/api/users/${user._id}/documents`).attach('document', PDF_FILE, 'dni.pdf')
    );
    expectSuccess(res);
    expect(seen).to.deep.equal([res.headers['x-request-id']]);
  });
});

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
