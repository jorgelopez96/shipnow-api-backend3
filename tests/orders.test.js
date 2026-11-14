import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ORDER_STATUS } from '../src/constants/index.js';
import { OrderModel } from '../src/models/order.model.js';
import { createOrder, createUser, expectError, expectSuccess, INVALID_ID, newId, ORDER_ITEMS, ORDER_ITEMS_TOTAL } from './helpers.js';

const VALID_STATUSES = `Estados válidos: ${Object.values(ORDER_STATUS).join(', ')}`;

describe('Orders API', () => {
  let customer;

  beforeEach(async () => {
    customer = await createUser();
  });

  const validOrder = (data = {}) => ({
    customer: String(customer._id),
    items: ORDER_ITEMS,
    deliveryAddress: 'Av. Siempre Viva 742',
    ...data,
  });

  describe('GET /api/orders', () => {
    it('debería listar los pedidos con el cliente populado', async () => {
      await createOrder(customer._id);
      await createOrder(customer._id);

      const orders = expectSuccess(await request(app).get('/api/orders'));

      expect(orders).to.be.an('array').with.lengthOf(2);
      for (const order of orders) {
        expect(order).to.include.all.keys('_id', 'customer', 'items', 'deliveryAddress', 'total', 'status', 'priority');
        expect(order.customer).to.deep.equal({
          _id: String(customer._id),
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
        });
      }
    });
  });

  describe('POST /api/orders', () => {
    it('debería crear un pedido calculando el total, con estado created y prioridad normal', async () => {
      const order = expectSuccess(await request(app).post('/api/orders').send(validOrder()), 201);

      expect(order).to.include({
        customer: String(customer._id),
        deliveryAddress: 'Av. Siempre Viva 742',
        total: ORDER_ITEMS_TOTAL,
        status: 'created',
        priority: 'normal',
      });
      expect(order.items).to.deep.equal(ORDER_ITEMS);
      expect(await OrderModel.exists({ _id: order._id })).to.not.equal(null);
    });

    it('debería respetar la prioridad enviada', async () => {
      const order = expectSuccess(await request(app).post('/api/orders').send(validOrder({ priority: 'high' })), 201);
      expect(order.priority).to.equal('high');
    });

    it('debería responder 400 ORDER_ITEMS_REQUIRED si no se envían items', async () => {
      const { items, ...withoutItems } = validOrder();
      expectError(await request(app).post('/api/orders').send(withoutItems), 400, 'ORDER_ITEMS_REQUIRED');
    });

    it('debería responder 400 ORDER_ITEMS_REQUIRED si la lista de items está vacía', async () => {
      expectError(await request(app).post('/api/orders').send(validOrder({ items: [] })), 400, 'ORDER_ITEMS_REQUIRED');
    });

    it('debería responder 404 USER_NOT_FOUND si falta el cliente', async () => {
      const { customer: _, ...withoutCustomer } = validOrder();
      const res = await request(app).post('/api/orders').send(withoutCustomer);
      expectError(res, 404, 'USER_NOT_FOUND', 'No se encontró el usuario indicado para crear el pedido');
    });

    it('debería responder 404 USER_NOT_FOUND si el cliente no existe', async () => {
      const res = await request(app).post('/api/orders').send(validOrder({ customer: newId() }));
      expectError(res, 404, 'USER_NOT_FOUND', 'No se encontró el usuario indicado para crear el pedido');
    });

    it('debería responder 400 INVALID_ID si el cliente no tiene formato de ID', async () => {
      expectError(await request(app).post('/api/orders').send(validOrder({ customer: INVALID_ID })), 400, 'INVALID_ID');
    });

    it('debería responder 400 VALIDATION_ERROR si falta la dirección de entrega', async () => {
      const { deliveryAddress, ...withoutAddress } = validOrder();
      const res = await request(app).post('/api/orders').send(withoutAddress);
      expectError(res, 400, 'VALIDATION_ERROR', 'El campo "deliveryAddress" es obligatorio');
    });

    it('debería responder 400 VALIDATION_ERROR si un item tiene cantidad 0', async () => {
      const res = await request(app).post('/api/orders').send(validOrder({ items: [{ name: 'Caja', quantity: 0, price: 100 }] }));
      expectError(res, 400, 'VALIDATION_ERROR', 'El valor de "quantity" está fuera del rango permitido');
    });

    it('debería responder 400 VALIDATION_ERROR si la prioridad no existe', async () => {
      const res = await request(app).post('/api/orders').send(validOrder({ priority: 'urgente' }));
      expectError(res, 400, 'VALIDATION_ERROR', '"urgente" no es un valor válido para "priority"');
    });

    it('debería responder 400 INVALID_JSON si el body no es un JSON válido', async () => {
      const res = await request(app).post('/api/orders').set('Content-Type', 'application/json').send('{"items": [');
      expectError(res, 400, 'INVALID_JSON');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('debería devolver el pedido con el cliente populado', async () => {
      const created = await createOrder(customer._id);
      const order = expectSuccess(await request(app).get(`/api/orders/${created._id}`));
      expect(order).to.include({ _id: String(created._id), total: ORDER_ITEMS_TOTAL, status: 'created' });
      expect(order.customer).to.include({ _id: String(customer._id), email: customer.email });
    });

    it('debería responder 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      expectError(await request(app).get(`/api/orders/${newId()}`), 404, 'ORDER_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).get(`/api/orders/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('debería cambiar el estado del pedido', async () => {
      const created = await createOrder(customer._id);
      const order = expectSuccess(await request(app).patch(`/api/orders/${created._id}/status`).send({ status: 'in_transit' }));
      expect(order).to.include({ _id: String(created._id), status: 'in_transit' });
      expect(order.customer).to.include({ email: customer.email });
    });

    it('debería responder 400 INVALID_ORDER_STATUS si el estado no existe', async () => {
      const created = await createOrder(customer._id);
      const body = expectError(
        await request(app).patch(`/api/orders/${created._id}/status`).send({ status: 'volando' }),
        400,
        'INVALID_ORDER_STATUS'
      );
      expect(body.details).to.equal(VALID_STATUSES);
    });

    it('debería responder 400 INVALID_ORDER_STATUS si no se envía el estado', async () => {
      const created = await createOrder(customer._id);
      expectError(await request(app).patch(`/api/orders/${created._id}/status`).send({}), 400, 'INVALID_ORDER_STATUS');
    });

    it('debería responder 409 ORDER_ALREADY_CLOSED si el pedido ya fue entregado o cancelado', async () => {
      for (const status of ['delivered', 'cancelled']) {
        const created = await createOrder(customer._id, { status });
        const res = await request(app).patch(`/api/orders/${created._id}/status`).send({ status: 'in_transit' });
        expect(expectError(res, 409, 'ORDER_ALREADY_CLOSED').details).to.equal(`Estado actual: ${status}`);
      }
    });

    it('debería responder 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const res = await request(app).patch(`/api/orders/${newId()}/status`).send({ status: 'assigned' });
      expectError(res, 404, 'ORDER_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      const res = await request(app).patch(`/api/orders/${INVALID_ID}/status`).send({ status: 'assigned' });
      expectError(res, 400, 'INVALID_ID');
    });
  });
});
