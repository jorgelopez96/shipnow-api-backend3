import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { DEFAULT_MOCK_QTY, MAX_MOCK_ITEMS } from '../src/constants/index.js';
import { DeliveryModel } from '../src/models/delivery.model.js';
import { OrderModel } from '../src/models/order.model.js';
import { UserModel } from '../src/models/user.model.js';
import { calculateOrderTotal } from '../src/utils/order-total.js';
import { expectError, expectSuccess } from './helpers.js';

const OBJECT_ID = /^[0-9a-f]{24}$/;

const expectUser = (user) => {
  expect(user).to.include.all.keys('_id', 'firstName', 'lastName', 'email', 'role');
  expect(user._id).to.match(OBJECT_ID);
  expect(user).to.not.have.property('password');
};

const expectDriver = (driver) => {
  expectUser(driver);
  expect(driver.role).to.equal('driver');
  expect(driver.isAvailable).to.be.a('boolean');
};

const expectOrder = (order) => {
  expect(order).to.include.all.keys('_id', 'customer', 'items', 'deliveryAddress', 'total', 'status', 'priority');
  expect(order.items).to.be.an('array').that.is.not.empty;
  expect(order.total).to.equal(calculateOrderTotal(order.items));
};

const expectDelivery = (delivery) => {
  expect(delivery).to.include.all.keys('_id', 'order', 'status', 'priority');
  if (['pending', 'cancelled'].includes(delivery.status)) expect(delivery).to.not.have.property('driver');
  else expect(delivery.driver).to.match(OBJECT_ID);
};

const MOCK_LISTS = [
  { path: '/api/mocks/mockingusers', check: expectUser },
  { path: '/api/mocks/users', check: expectUser },
  { path: '/api/mocks/drivers', check: expectDriver },
  { path: '/api/mocks/mockingorders', check: expectOrder },
  { path: '/api/mocks/orders', check: expectOrder },
  { path: '/api/mocks/deliveries', check: expectDelivery },
];

describe('Mocks API', () => {
  for (const { path, check } of MOCK_LISTS) {
    describe(`GET ${path}`, () => {
      it(`debería generar ${DEFAULT_MOCK_QTY} registros por defecto sin guardarlos`, async () => {
        const list = expectSuccess(await request(app).get(path));
        expect(list).to.be.an('array').with.lengthOf(DEFAULT_MOCK_QTY);
        list.forEach(check);
        expect(await UserModel.countDocuments()).to.equal(0);
        expect(await OrderModel.countDocuments()).to.equal(0);
      });

      it('debería generar la cantidad pedida en ?qty', async () => {
        const list = expectSuccess(await request(app).get(`${path}?qty=3`));
        expect(list).to.have.lengthOf(3);
        list.forEach(check);
      });

      it('debería responder 400 INVALID_MOCK_AMOUNT si qty no es un entero positivo', async () => {
        expectError(await request(app).get(`${path}?qty=abc`), 400, 'INVALID_MOCK_AMOUNT', '"qty" debe ser un número entero');
        expectError(await request(app).get(`${path}?qty=1.5`), 400, 'INVALID_MOCK_AMOUNT', '"qty" debe ser un número entero');
        expectError(await request(app).get(`${path}?qty=0`), 400, 'INVALID_MOCK_AMOUNT', '"qty" debe ser mayor a 0');
        expectError(await request(app).get(`${path}?qty=-3`), 400, 'INVALID_MOCK_AMOUNT', '"qty" no puede ser negativo');
      });

      it(`debería responder 400 MOCK_LIMIT_EXCEEDED si qty supera ${MAX_MOCK_ITEMS}`, async () => {
        const res = await request(app).get(`${path}?qty=${MAX_MOCK_ITEMS + 1}`);
        expectError(res, 400, 'MOCK_LIMIT_EXCEEDED', `"qty" no puede ser mayor a ${MAX_MOCK_ITEMS}`);
      });
    });
  }

  for (const path of ['/api/mocks/generateData', '/api/mocks/seed']) {
    describe(`POST ${path}`, () => {
      const expectNothingSaved = async () => {
        expect(await UserModel.countDocuments()).to.equal(0);
        expect(await OrderModel.countDocuments()).to.equal(0);
        expect(await DeliveryModel.countDocuments()).to.equal(0);
      };

      it('debería guardar en MongoDB las cantidades del body, relacionadas entre sí', async () => {
        const counts = { users: 3, drivers: 2, orders: 4, deliveries: 2 };
        expect(expectSuccess(await request(app).post(path).send(counts), 201)).to.deep.equal(counts);

        const customers = await UserModel.find({ role: 'customer' }).lean();
        const drivers = await UserModel.find({ role: 'driver' }).lean();
        const orders = await OrderModel.find().lean();
        const deliveries = await DeliveryModel.find().lean();
        expect([customers.length, drivers.length, orders.length, deliveries.length]).to.deep.equal([3, 2, 4, 2]);

        const ids = (docs) => docs.map((doc) => String(doc._id));
        orders.forEach((order) => expect(ids(customers)).to.include(String(order.customer)));
        deliveries.forEach((delivery) => expect(ids(orders)).to.include(String(delivery.order)));
        expect(customers[0].password).to.match(/^\$2[aby]\$/);
      });

      it('debería usar ?qty para los tipos que no vienen en el body', async () => {
        const payload = expectSuccess(await request(app).post(`${path}?qty=2`).send({ deliveries: 1 }), 201);
        expect(payload).to.deep.equal({ users: 2, drivers: 2, orders: 2, deliveries: 1 });
        expect(await UserModel.countDocuments()).to.equal(4);
      });

      it('debería responder 400 INVALID_MOCK_AMOUNT si no se pide ninguna cantidad', async () => {
        const res = await request(app).post(path).send({});
        expectError(res, 400, 'INVALID_MOCK_AMOUNT', 'Indicá al menos una cantidad mayor a 0 (?qty=N o body { users, drivers, orders, deliveries })');
        await expectNothingSaved();
      });

      it('debería responder 400 INVALID_MOCK_AMOUNT si una cantidad es negativa o no es entera', async () => {
        expectError(await request(app).post(path).send({ users: -1 }), 400, 'INVALID_MOCK_AMOUNT', '"users" no puede ser negativo');
        expectError(await request(app).post(path).send({ users: 1.5 }), 400, 'INVALID_MOCK_AMOUNT', '"users" debe ser un número entero');
        await expectNothingSaved();
      });

      it(`debería responder 400 MOCK_LIMIT_EXCEEDED si una cantidad supera ${MAX_MOCK_ITEMS}`, async () => {
        const res = await request(app).post(path).send({ users: 1, orders: MAX_MOCK_ITEMS + 1 });
        expectError(res, 400, 'MOCK_LIMIT_EXCEEDED', `"orders" no puede ser mayor a ${MAX_MOCK_ITEMS}`);
        await expectNothingSaved();
      });

      it('debería responder 400 MOCK_DEPENDENCIES_MISSING si faltan datos relacionados', async () => {
        expectError(
          await request(app).post(path).send({ orders: 2 }),
          400,
          'MOCK_DEPENDENCIES_MISSING',
          'Para generar pedidos hace falta generar al menos un usuario (cliente)'
        );
        expectError(
          await request(app).post(path).send({ users: 1, orders: 1, deliveries: 1 }),
          400,
          'MOCK_DEPENDENCIES_MISSING',
          'Para generar entregas hace falta generar al menos un pedido y un repartidor'
        );
        await expectNothingSaved();
      });

      it('debería responder 400 INVALID_JSON si el body no es un JSON válido', async () => {
        expectError(await request(app).post(path).set('Content-Type', 'application/json').send('{"users":'), 400, 'INVALID_JSON');
      });
    });
  }
});
