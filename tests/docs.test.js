import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { swaggerSpecs } from '../src/docs/swagger.config.js';
import { newId } from './helpers.js';

const documentedOperations = Object.entries(swaggerSpecs.paths).flatMap(([path, item]) =>
  Object.keys(item)
    .filter((method) => method !== 'parameters')
    .map((method) => ({ method, path, operation: item[method], responses: Object.keys(item[method].responses) }))
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
    });

    it('debería agrupar los endpoints por tags, incluidos Mocks y Logger fuera de producción', () => {
      expect(swaggerSpecs.tags.map((tag) => tag.name)).to.deep.equal(['Users', 'Products', 'Orders', 'Deliveries', 'Health', 'Mocks', 'Logger']);
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

    it('debería explicar cada endpoint con un summary y una description', () => {
      documentedOperations.forEach(({ method, path, operation }) => {
        expect(operation.summary, `${method} ${path}`).to.be.a('string').that.is.not.empty;
        expect(operation.description, `${method} ${path}`).to.be.a('string').that.is.not.empty;
      });
    });

    it('debería usar respuestas reutilizables ($ref) para todos los errores', () => {
      const inline = documentedOperations.flatMap(({ method, path, operation }) =>
        Object.entries(operation.responses)
          .filter(([status, response]) => Number(status) >= 400 && !response.$ref)
          .map(([status]) => `${status} ${method} ${path}`)
      );
      expect(inline).to.deep.equal([]);
    });

    it('debería usar un server relativo, para que Try it out funcione en cualquier host y puerto', () => {
      expect(swaggerSpecs.servers).to.deep.equal([{ url: '/', description: 'Este servidor' }]);
    });

    it('debería documentar page y limit en todos los listados', () => {
      for (const path of ['/api/users', '/api/products', '/api/orders', '/api/deliveries']) {
        const refs = swaggerSpecs.paths[path].get.parameters.map((parameter) => parameter.$ref);
        expect(refs, path).to.include.members(['#/components/parameters/page', '#/components/parameters/limit']);
      }
    });

    it('debería documentar el 413 PAYLOAD_TOO_LARGE en todos los endpoints que reciben JSON', () => {
      const withJsonBody = documentedOperations.filter(({ operation }) => operation.requestBody?.content?.['application/json']);
      expect(withJsonBody).to.not.be.empty;
      withJsonBody.forEach(({ method, path, operation }) => {
        expect(operation.responses['413']?.$ref, `${method} ${path}`).to.equal('#/components/responses/PayloadTooLarge');
      });
    });

    it('debería documentar el 503 del health check', () => {
      expect(swaggerSpecs.paths['/api/health'].get.responses['503'].$ref).to.equal('#/components/responses/DatabaseUnavailable');
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
