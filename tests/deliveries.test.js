import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { DeliveryModel } from '../src/models/delivery.model.js';
import { createDriver, createOrder, createUser, expectError, expectPage, expectSuccess, INVALID_ID, newId } from './helpers.js';

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

      const [delivery, ...rest] = expectPage(await request(app).get('/api/deliveries'), { page: 1, limit: 10, total: 1, totalPages: 1 });

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

    it('debería filtrar por status', async () => {
      await DeliveryModel.create({ order: order._id, driver: driver._id, status: 'assigned' });
      const pending = await DeliveryModel.create({ order: order._id });

      const deliveries = expectPage(await request(app).get('/api/deliveries?status=pending'), { page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(deliveries.map((delivery) => delivery._id)).to.deep.equal([String(pending._id)]);
    });

    it('debería responder 400 INVALID_QUERY_PARAM si el status no existe', async () => {
      expectError(await request(app).get('/api/deliveries?status=perdida'), 400, 'INVALID_QUERY_PARAM', 'El parámetro "status" no es válido');
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

  describe('PATCH /api/deliveries/:id/status (tracking)', () => {
    const track = (id, body) => request(app).patch(`/api/deliveries/${id}/status`).send(body);
    const orderStatus = async (id) => expectSuccess(await request(app).get(`/api/orders/${id}`)).status;

    it('debería seguir el envío completo: crear pedido y entrega, avanzarla hasta delivered y dejar el historial', async () => {
      const customer = await createUser();
      const newOrder = expectSuccess(
        await request(app)
          .post('/api/orders')
          .send({ customer: customer._id, deliveryAddress: 'Calle Falsa 123', items: [{ name: 'Caja', quantity: 1, price: 900 }] }),
        201
      );
      const delivery = expectSuccess(await request(app).post('/api/deliveries').send({ order: newOrder._id }), 201);
      expect(delivery.history.map((change) => change.status)).to.deep.equal(['pending']);

      expectSuccess(await track(delivery._id, { status: 'assigned', driver: driver._id }));
      expect(await orderStatus(newOrder._id)).to.equal('assigned');
      expectSuccess(await track(delivery._id, { status: 'picked_up' }));
      expectSuccess(await track(delivery._id, { status: 'in_transit' }));
      expect(await orderStatus(newOrder._id)).to.equal('in_transit');

      const delivered = expectSuccess(await track(delivery._id, { status: 'delivered' }));
      expect(delivered).to.include({ status: 'delivered' });
      expect(delivered.driver).to.include({ _id: String(driver._id), role: 'driver' });
      expect(delivered.order).to.include({ _id: newOrder._id, status: 'delivered' });
      expect(delivered.history.map((change) => change.status)).to.deep.equal(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered']);
      for (const change of delivered.history) expect(new Date(change.changedAt).toISOString()).to.equal(change.changedAt);
    });

    it('debería pasar el pedido a created si la entrega vuelve a pending', async () => {
      const created = await DeliveryModel.create({ order: order._id, driver: driver._id, status: 'assigned' });
      expectSuccess(await track(created._id, { status: 'pending' }));
      expect(await orderStatus(order._id)).to.equal('created');
    });

    it('debería cancelar una entrega sin repartidor y cancelar su pedido', async () => {
      const created = await DeliveryModel.create({ order: order._id });
      expect(expectSuccess(await track(created._id, { status: 'cancelled' }))).to.include({ status: 'cancelled' });
      expect(await orderStatus(order._id)).to.equal('cancelled');
    });

    for (const body of [{}, { status: 'perdida' }]) {
      it(`debería responder 400 INVALID_DELIVERY_STATUS con ${JSON.stringify(body)}`, async () => {
        const created = await DeliveryModel.create({ order: order._id });
        const res = await track(created._id, body);
        expectError(res, 400, 'INVALID_DELIVERY_STATUS');
        expect(res.body.details).to.include('pending, assigned');
      });
    }

    it('debería responder 400 DRIVER_REQUIRED si la entrega no tiene repartidor y no se manda uno', async () => {
      const created = await DeliveryModel.create({ order: order._id });
      expectError(await track(created._id, { status: 'in_transit' }), 400, 'DRIVER_REQUIRED');
      expect(await orderStatus(order._id)).to.equal('created');
    });

    it('debería responder 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      expectError(await track(newId(), { status: 'assigned' }), 404, 'DELIVERY_NOT_FOUND');
    });

    it('debería responder 404 DRIVER_NOT_FOUND si el repartidor no existe', async () => {
      const created = await DeliveryModel.create({ order: order._id });
      expectError(await track(created._id, { status: 'assigned', driver: newId() }), 404, 'DRIVER_NOT_FOUND');
    });

    it('debería responder 409 DRIVER_NOT_AVAILABLE si el repartidor no está disponible', async () => {
      const created = await DeliveryModel.create({ order: order._id });
      const busyDriver = await createDriver({ isAvailable: false });
      expectError(await track(created._id, { status: 'assigned', driver: busyDriver._id }), 409, 'DRIVER_NOT_AVAILABLE');
    });

    it('debería responder 409 DELIVERY_ALREADY_CLOSED si la entrega ya fue entregada', async () => {
      const created = await DeliveryModel.create({ order: order._id, driver: driver._id, status: 'delivered' });
      expectError(await track(created._id, { status: 'in_transit' }), 409, 'DELIVERY_ALREADY_CLOSED');
    });

    it('debería responder 409 ORDER_ALREADY_CLOSED si el pedido ya fue cancelado', async () => {
      const cancelledOrder = await createOrder((await createUser())._id, { status: 'cancelled' });
      const created = await DeliveryModel.create({ order: cancelledOrder._id, driver: driver._id, status: 'assigned' });
      expectError(await track(created._id, { status: 'in_transit' }), 409, 'ORDER_ALREADY_CLOSED');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await track(INVALID_ID, { status: 'assigned' }), 400, 'INVALID_ID');
    });
  });
});
