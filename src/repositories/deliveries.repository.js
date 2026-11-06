import { DeliveryModel } from '../models/delivery.model.js';

export const deliveriesRepository = {
  create: (data) => DeliveryModel.create(data),
  insertMany: (deliveries) => DeliveryModel.insertMany(deliveries),
  findAll: (filter = {}) =>
    DeliveryModel.find(filter).populate('order', 'status total').populate('driver', 'firstName lastName role'),
  findById: (id) =>
    DeliveryModel.findById(id).populate('order', 'status total').populate('driver', 'firstName lastName role'),
  deleteByIds: (ids) => DeliveryModel.deleteMany({ _id: { $in: ids } }),
};
