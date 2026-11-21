import { DeliveryModel } from '../models/delivery.model.js';
import { findPage } from './find-page.js';

const withRelations = (query) => query.populate('order', 'status total').populate('driver', 'firstName lastName role');

export const deliveriesRepository = {
  create: (data) => DeliveryModel.create(data),
  insertMany: (deliveries) => DeliveryModel.insertMany(deliveries),
  findPage: (filter, pagination) => findPage(DeliveryModel, filter, pagination, withRelations),
  findById: (id) => withRelations(DeliveryModel.findById(id)),
  deleteByIds: (ids) => DeliveryModel.deleteMany({ _id: { $in: ids } }),
};
