import { expect } from 'chai';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { USER_ROLES } from '../src/constants/index.js';
import { ERRORS } from '../src/errors/error-dictionary.js';
import { OrderModel } from '../src/models/order.model.js';
import { UserModel } from '../src/models/user.model.js';

export const INVALID_ID = '123';
export const newId = () => new mongoose.Types.ObjectId().toString();

let sequence = 0;
const uniqueEmail = (prefix) => `${prefix}.${Date.now()}.${sequence++}@shipnow.test`;

export const createUser = (data = {}) =>
  UserModel.create({
    firstName: 'Lucía',
    lastName: 'Fernández',
    email: uniqueEmail('cliente'),
    password: 'hash-de-prueba',
    role: USER_ROLES.CUSTOMER,
    ...data,
  });

export const createDriver = (data = {}) =>
  createUser({ firstName: 'Martín', lastName: 'Gómez', email: uniqueEmail('repartidor'), role: USER_ROLES.DRIVER, isAvailable: true, ...data });

export const ORDER_ITEMS = [
  { name: 'Paquete mediano', quantity: 2, price: 1500 },
  { name: 'Sobre', quantity: 1, price: 500 },
];
export const ORDER_ITEMS_TOTAL = 3500;

export const createOrder = (customer, data = {}) =>
  OrderModel.create({ customer, items: ORDER_ITEMS, deliveryAddress: 'Av. Siempre Viva 742', total: ORDER_ITEMS_TOTAL, ...data });

export const expectSuccess = (res, statusCode = 200) => {
  expect(res.status).to.equal(statusCode);
  expect(res.body).to.have.all.keys('status', 'payload');
  expect(res.body.status).to.equal('success');
  return res.body.payload;
};

// Valida el formato del middleware de errores: { status, statusCode, error, message, details? }.
// Si no se pasa un mensaje, se espera el del diccionario de errores.
export const expectError = (res, statusCode, code, message = ERRORS[code].message) => {
  expect(res.status).to.equal(statusCode);
  expect(res.body).to.include({ status: 'error', statusCode, error: code, message });
  expect(Object.keys(res.body)).to.satisfy((keys) =>
    keys.every((key) => ['status', 'statusCode', 'error', 'message', 'details'].includes(key))
  );
  return res.body;
};

// Archivos de prueba en memoria: con la firma del formato alcanza para pasar la validación de contenido.
export const PDF_FILE = Buffer.from('%PDF-1.4\n%Documento de prueba\n');
export const PNG_FILE = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

// Archivos que quedaron en una subcarpeta de uploads (por ejemplo 'tmp' o 'documents').
export const filesIn = (folder) => readdir(path.join(config.uploadsDir, folder)).catch(() => []);
export const fileExists = (filePath) => access(filePath).then(() => true, () => false);
