import { ProductModel } from '../models/product.model.js';

const DEFAULT_SORT = { createdAt: -1 };
const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

export const productsRepository = {
  create: async (data) => (await ProductModel.create(data)).toObject(),
  findAll: (filter = {}) => ProductModel.find(filter).sort(DEFAULT_SORT).lean(),
  findById: (id) => ProductModel.findById(id).lean(),
  updateById: (id, data) => ProductModel.findByIdAndUpdate(id, data, UPDATE_OPTIONS).lean(),
  deleteById: (id) => ProductModel.findByIdAndDelete(id).lean(),
};
