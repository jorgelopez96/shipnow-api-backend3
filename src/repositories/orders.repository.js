import { OrderModel } from '../models/order.model.js';
import { findPage } from './find-page.js';

const CUSTOMER_FIELDS = 'firstName lastName email';
const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

export const ordersRepository = {
  create: (data) => OrderModel.create(data),
  insertMany: (orders) => OrderModel.insertMany(orders),
  findPage: (filter, pagination) => findPage(OrderModel, filter, pagination, (query) => query.populate('customer', CUSTOMER_FIELDS)),
  findById: (id) => OrderModel.findById(id).populate('customer', CUSTOMER_FIELDS),
  updateStatus: (id, status) => OrderModel.findByIdAndUpdate(id, { status }, UPDATE_OPTIONS).populate('customer', CUSTOMER_FIELDS),
  setProof: (id, proof) => OrderModel.findByIdAndUpdate(id, { proof }, UPDATE_OPTIONS).populate('customer', CUSTOMER_FIELDS),
  deleteByIds: (ids) => OrderModel.deleteMany({ _id: { $in: ids } }),
};
