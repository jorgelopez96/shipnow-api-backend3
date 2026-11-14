import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ProductModel } from '../src/models/product.model.js';
import { expectError, expectSuccess, INVALID_ID, newId } from './helpers.js';

const validProduct = (data = {}) => ({
  title: 'Caja mediana',
  description: 'Caja de cartón 40x30x30',
  code: 'CAJA-M-01',
  price: 1500,
  stock: 20,
  category: 'embalaje',
  ...data,
});

const createProduct = (data) => ProductModel.create(validProduct(data));

describe('Products API', () => {
  describe('GET /api/products', () => {
    it('debería listar solo los productos con stock, del más nuevo al más viejo', async () => {
      // Fechas fijas para que el orden no dependa de en qué milisegundo se creó cada uno.
      const createdOn = (date, data) =>
        ProductModel.create([validProduct({ ...data, createdAt: new Date(date) })], { timestamps: false });
      await createdOn('2026-01-01', { code: 'VIEJO' });
      await createdOn('2026-01-02', { code: 'SIN-STOCK', stock: 0, status: 'out_of_stock' });
      await createdOn('2026-01-03', { code: 'NUEVO' });

      const products = expectSuccess(await request(app).get('/api/products'));

      expect(products.map((product) => product.code)).to.deep.equal(['NUEVO', 'VIEJO']);
      expect(products.every((product) => product.status === 'available')).to.equal(true);
    });
  });

  describe('POST /api/products', () => {
    it('debería crear un producto y calcular su estado según el stock', async () => {
      const product = expectSuccess(await request(app).post('/api/products').send(validProduct()), 201);
      expect(product).to.include({ code: 'CAJA-M-01', price: 1500, stock: 20, status: 'available' });
      expect(product).to.have.property('_id');
    });

    it('debería crear el producto como out_of_stock si el stock es 0', async () => {
      const product = expectSuccess(await request(app).post('/api/products').send(validProduct({ stock: 0 })), 201);
      expect(product.status).to.equal('out_of_stock');
    });

    it('debería ignorar el status enviado en el body', async () => {
      const res = await request(app).post('/api/products').send(validProduct({ stock: 0, status: 'available' }));
      expect(expectSuccess(res, 201).status).to.equal('out_of_stock');
    });

    it('debería responder 400 VALIDATION_ERROR si faltan campos obligatorios', async () => {
      const res = await request(app).post('/api/products').send({ title: 'Caja', description: 'd', code: 'C1', price: 10, stock: 5 });
      expectError(res, 400, 'VALIDATION_ERROR', 'El campo "category" es obligatorio');
    });

    it('debería responder 409 DUPLICATE_VALUE si el code ya existe', async () => {
      await createProduct();
      const body = expectError(await request(app).post('/api/products').send(validProduct()), 409, 'DUPLICATE_VALUE');
      expect(body.details).to.equal('Campos: code');
    });
  });

  describe('GET /api/products/:id', () => {
    it('debería devolver un producto con stock', async () => {
      const created = await createProduct();
      expect(expectSuccess(await request(app).get(`/api/products/${created._id}`))).to.include({ code: 'CAJA-M-01' });
    });

    it('debería responder 404 PRODUCT_OUT_OF_STOCK si el producto no tiene stock', async () => {
      const created = await createProduct({ stock: 0, status: 'out_of_stock' });
      expectError(await request(app).get(`/api/products/${created._id}`), 404, 'PRODUCT_OUT_OF_STOCK');
    });

    it('debería responder 404 PRODUCT_NOT_FOUND si el producto no existe', async () => {
      expectError(await request(app).get(`/api/products/${newId()}`), 404, 'PRODUCT_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).get(`/api/products/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('debería recalcular el estado cuando cambia el stock', async () => {
      const created = await createProduct();
      const product = expectSuccess(await request(app).put(`/api/products/${created._id}`).send({ stock: 0 }));
      expect(product).to.include({ stock: 0, status: 'out_of_stock', code: 'CAJA-M-01' });
    });

    it('debería responder 400 VALIDATION_ERROR si un valor está fuera de rango', async () => {
      const created = await createProduct();
      const res = await request(app).put(`/api/products/${created._id}`).send({ price: -1 });
      expectError(res, 400, 'VALIDATION_ERROR', 'El valor de "price" está fuera del rango permitido');
    });

    it('debería responder 409 DUPLICATE_VALUE si el code lo usa otro producto', async () => {
      await createProduct({ code: 'OTRO' });
      const created = await createProduct();
      expectError(await request(app).put(`/api/products/${created._id}`).send({ code: 'OTRO' }), 409, 'DUPLICATE_VALUE');
    });

    it('debería responder 404 PRODUCT_NOT_FOUND si el producto no existe', async () => {
      expectError(await request(app).put(`/api/products/${newId()}`).send({ price: 10 }), 404, 'PRODUCT_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).put(`/api/products/${INVALID_ID}`).send({ price: 10 }), 400, 'INVALID_ID');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('debería eliminar el producto y devolverlo', async () => {
      const created = await createProduct();
      expect(expectSuccess(await request(app).delete(`/api/products/${created._id}`))).to.include({ code: 'CAJA-M-01' });
      expect(await ProductModel.exists({ _id: created._id })).to.equal(null);
    });

    it('debería responder 404 PRODUCT_NOT_FOUND si el producto no existe', async () => {
      expectError(await request(app).delete(`/api/products/${newId()}`), 404, 'PRODUCT_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).delete(`/api/products/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });
});
