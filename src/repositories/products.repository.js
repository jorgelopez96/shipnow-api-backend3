import { ProductModel } from '../models/product.model.js';
import { findPage } from './find-page.js';

const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

export const productsRepository = {
  create: async (data) => (await ProductModel.create(data)).toObject(),
  findPage: (filter, pagination) => findPage(ProductModel, filter, pagination, (query) => query.lean()),
  findById: (id) => ProductModel.findById(id).lean(),
  updateById: (id, data) => ProductModel.findByIdAndUpdate(id, data, UPDATE_OPTIONS).lean(),
  deleteById: (id) => ProductModel.findByIdAndDelete(id).lean(),
};
