import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { DeliveryModel } from '../src/models/delivery.model.js';
import { createDriver, createOrder, createUser, expectError, expectSuccess, INVALID_ID, newId } from './helpers.js';

describe('Deliveries API', () => {
  let order;
  let driver;

  beforeEach(async () => {
    const customer = await createUser();
    order = await createOrder(customer._id, { priority: 'high' });
    driver = await createDriver();
  });

  describe('GET /api/deliveries', () => {
    it('debería listar las entregas con el pedido y el repartidor populados', async () => {
      await DeliveryModel.create({ order: order._id, driver: driver._id, status: 'assigned' });

      const [delivery, ...rest] = expectSuccess(await request(app).get('/api/deliveries'));

      expect(rest).to.have.lengthOf(0);
      expect(delivery.order).to.deep.equal({ _id: String(order._id), status: order.status, total: order.total });
      expect(delivery.driver).to.deep.equal({
        _id: String(driver._id),
        firstName: driver.firstName,
        lastName: driver.lastName,
        role: 'driver',
      });
      expect(delivery).to.include({ status: 'assigned' });
    });
  });

  describe('POST /api/deliveries', () => {
    it('debería crear una entrega asignada si se indica un repartidor disponible', async () => {
      const res = await request(app).post('/api/deliveries').send({ order: order._id, driver: driver._id });
      const delivery = expectSuccess(res, 201);
      expect(delivery).to.include({ order: String(order._id), driver: String(driver._id), status: 'assigned', priority: 'high' });
    });

    it('debería crear una entrega pendiente si no se indica repartidor', async () => {
      const delivery = expectSuccess(await request(app).post('/api/deliveries').send({ order: order._id }), 201);
      expect(delivery).to.include({ order: String(order._id), status: 'pending', priority: 'high' });
      expect(delivery).to.not.have.property('driver');
    });

    it('debería responder 400 VALIDATION_ERROR si falta el pedido', async () => {
      const res = await request(app).post('/api/deliveries').send({});
      expectError(res, 400, 'VALIDATION_ERROR', 'El campo "order" es obligatorio');
    });

    it('debería responder 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const res = await request(app).post('/api/deliveries').send({ order: newId() });
      expectError(res, 404, 'ORDER_NOT_FOUND', 'El pedido de la entrega no existe');
    });

    it('debería responder 400 INVALID_ID si el pedido o el repartidor no tienen formato de ID', async () => {
      expectError(await request(app).post('/api/deliveries').send({ order: INVALID_ID }), 400, 'INVALID_ID');
      expectError(await request(app).post('/api/deliveries').send({ order: order._id, driver: INVALID_ID }), 400, 'INVALID_ID');
    });

    it('debería responder 404 DRIVER_NOT_FOUND si el repartidor no existe', async () => {
      const res = await request(app).post('/api/deliveries').send({ order: order._id, driver: newId() });
      expectError(res, 404, 'DRIVER_NOT_FOUND');
    });

    it('debería responder 404 DRIVER_NOT_FOUND si el usuario no tiene rol driver', async () => {
      const customer = await createUser();
      const res = await request(app).post('/api/deliveries').send({ order: order._id, driver: customer._id });
      expectError(res, 404, 'DRIVER_NOT_FOUND');
    });

    it('debería responder 409 DRIVER_NOT_AVAILABLE si el repartidor no está disponible', async () => {
      const busyDriver = await createDriver({ isAvailable: false });
      const res = await request(app).post('/api/deliveries').send({ order: order._id, driver: busyDriver._id });
      expectError(res, 409, 'DRIVER_NOT_AVAILABLE');
    });
  });

  describe('GET /api/deliveries/:id', () => {
    it('debería devolver la entrega pedida', async () => {
      const created = await DeliveryModel.create({ order: order._id });
      const delivery = expectSuccess(await request(app).get(`/api/deliveries/${created._id}`));
      expect(delivery).to.include({ _id: String(created._id), status: 'pending' });
      expect(delivery.order).to.include({ _id: String(order._id) });
    });

    it('debería responder 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      expectError(await request(app).get(`/api/deliveries/${newId()}`), 404, 'DELIVERY_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).get(`/api/deliveries/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });
});
