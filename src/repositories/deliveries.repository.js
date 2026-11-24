import { DeliveryModel } from '../models/delivery.model.js';
import { findPage } from './find-page.js';

const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

const withRelations = (query) => query.populate('order', 'status total').populate('driver', 'firstName lastName role');

export const deliveriesRepository = {
  create: (data) => DeliveryModel.create(data),
  insertMany: (deliveries) => DeliveryModel.insertMany(deliveries),
  findPage: (filter, pagination) => findPage(DeliveryModel, filter, pagination, withRelations),
  findById: (id) => withRelations(DeliveryModel.findById(id)),
  updateStatus: (id, { status, driver }) =>
    withRelations(DeliveryModel.findByIdAndUpdate(id, { status, driver, $push: { history: { status } } }, UPDATE_OPTIONS)),
  deleteByIds: (ids) => DeliveryModel.deleteMany({ _id: { $in: ids } }),
};
