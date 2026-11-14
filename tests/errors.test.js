import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { expectError } from './helpers.js';

describe('Manejo de errores general', () => {
  it('debería responder 404 ROUTE_NOT_FOUND ante una ruta inexistente', async () => {
    const body = expectError(await request(app).get('/api/ruta-que-no-existe'), 404, 'ROUTE_NOT_FOUND');
    expect(body.details).to.equal('GET /api/ruta-que-no-existe');
  });

  it('debería responder 404 ROUTE_NOT_FOUND ante un método no definido en una ruta existente', async () => {
    const body = expectError(await request(app).delete('/api/orders'), 404, 'ROUTE_NOT_FOUND');
    expect(body.details).to.equal('DELETE /api/orders');
  });

  it('debería incluir details fuera de producción para ayudar a depurar', async () => {
    const body = expectError(await request(app).get('/api/users/123'), 400, 'INVALID_ID');
    expect(body.details).to.equal('Valor recibido en "_id": 123');
  });
});
