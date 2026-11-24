import { expect } from 'chai';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { config } from '../src/config/index.js';
import { expectError, expectSuccess } from './helpers.js';

describe('Health check', () => {
  describe('GET /api/health', () => {
    it('debería responder el estado, el entorno, el uptime, la hora y la conexión a la base', async () => {
      const health = expectSuccess(await request(app).get('/api/health'));

      expect(health).to.have.all.keys('status', 'environment', 'uptime', 'timestamp', 'database');
      expect(health).to.include({ status: 'ok', environment: 'test', database: 'connected' });
      expect(health.uptime).to.be.a('number').that.is.at.least(0);
      expect(new Date(health.timestamp).toISOString()).to.equal(health.timestamp);
    });

    it('no debería exponer datos sensibles ni del servidor', async () => {
      const res = await request(app).get('/api/health');
      const body = JSON.stringify(res.body);

      expect(body).to.not.include(config.mongoUri);
      expect(body).to.not.match(/mongodb|password|version|node_modules/i);
      expect(res.headers).to.not.have.property('x-powered-by');
    });

    it('debería responder 503 DATABASE_UNAVAILABLE si no hay conexión con MongoDB', async () => {
      // Simula la caída sin cortar la conexión real que usa el resto de la suite.
      Object.defineProperty(mongoose.connection, 'readyState', { get: () => 0, configurable: true });
      try {
        expectError(await request(app).get('/api/health'), 503, 'DATABASE_UNAVAILABLE');
      } finally {
        delete mongoose.connection.readyState;
      }
      expect(mongoose.connection.readyState).to.equal(1);
    });
  });
});
