import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { swaggerSpecs } from '../src/docs/swagger.config.js';
import { newId } from './helpers.js';

const documentedOperations = Object.entries(swaggerSpecs.paths).flatMap(([path, item]) =>
  Object.keys(item)
    .filter((method) => method !== 'parameters')
    .map((method) => ({ method, path, responses: Object.keys(item[method].responses) }))
);

describe('Swagger', () => {
  describe('GET /api/docs', () => {
    it('debería redirigir /api/docs a /api/docs/', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).to.equal(301);
      expect(res.headers.location).to.equal('/api/docs/');
    });

    it('debería servir la interfaz de Swagger UI', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('text/html');
      expect(res.text).to.include('swagger-ui');
    });
  });

  describe('Especificación OpenAPI', () => {
    it('debería tener la información general de la API', () => {
      expect(swaggerSpecs.openapi).to.equal('3.0.0');
      expect(swaggerSpecs.info).to.include({ title: 'ShipNow API', version: '1.0.0' });
      expect(swaggerSpecs.servers[0].url).to.match(/^http:\/\/localhost:\d+$/);
    });

    it('debería agrupar los endpoints por tags, incluidos Mocks y Logger fuera de producción', () => {
      expect(swaggerSpecs.tags.map((tag) => tag.name)).to.deep.equal(['Users', 'Products', 'Orders', 'Deliveries', 'Mocks', 'Logger']);
      documentedOperations.forEach(({ method, path }) => {
        expect(swaggerSpecs.paths[path][method].tags, `${method} ${path}`).to.have.lengthOf(1);
      });
    });

    it('debería definir los schemas reutilizables', () => {
      expect(swaggerSpecs.components.schemas).to.include.all.keys(
        'User',
        'Order',
        'OrderItem',
        'Delivery',
        'SuccessResponse',
        'ErrorResponse'
      );
    });

    it('no debería tener referencias ($ref) rotas', () => {
      const refs = JSON.stringify(swaggerSpecs).match(/"\$ref":"[^"]+"/g) ?? [];
      const broken = refs
        .map((ref) => ref.slice(8, -1))
        .filter((ref) => ref.slice(2).split('/').reduce((node, key) => node?.[key], swaggerSpecs) === undefined);
      expect(broken).to.deep.equal([]);
    });
  });

  // Cada ruta documentada existe en la API y responde con un status que figura en su documentación.
  describe('Coherencia entre la documentación y la API', () => {
    for (const { method, path, responses } of documentedOperations) {
      it(`${method.toUpperCase()} ${path} existe y responde un status documentado`, async () => {
        const res = await request(app)[method](path.replace('{id}', newId())).send({});
        expect(res.body.error, 'la ruta no existe en la API').to.not.equal('ROUTE_NOT_FOUND');
        expect(responses, `status ${res.status} no documentado`).to.include(String(res.status));
      });
    }
  });
});
