import { PRODUCT_STATUS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { productsRepository } from '../repositories/products.repository.js';
import { pickFields } from '../utils/pick-fields.js';

const EDITABLE_FIELDS = ['title', 'description', 'code', 'price', 'stock', 'category'];

const statusFromStock = (stock) => (stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK);

const withStatus = (data) => (data.stock === undefined ? data : { ...data, status: statusFromStock(data.stock) });

const ensureFound = (product) => {
  if (!product) throw new AppError('PRODUCT_NOT_FOUND');
  return product;
};

export const productsService = {
  getAvailable: () => productsRepository.findAll({ status: PRODUCT_STATUS.AVAILABLE }),

  async getById(id) {
    const product = ensureFound(await productsRepository.findById(id));
    if (product.status !== PRODUCT_STATUS.AVAILABLE) throw new AppError('PRODUCT_OUT_OF_STOCK');
    return product;
  },

  create: (data) => productsRepository.create(withStatus(pickFields(data, EDITABLE_FIELDS))),

  update: async (id, data) => ensureFound(await productsRepository.updateById(id, withStatus(pickFields(data, EDITABLE_FIELDS)))),

  remove: async (id) => ensureFound(await productsRepository.deleteById(id)),
};
