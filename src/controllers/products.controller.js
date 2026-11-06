import { productsService } from '../services/products.service.js';
import { sendSuccess } from '../utils/send-success.js';

export const productsController = {
  async getAll(req, res, next) {
    try {
      sendSuccess(res, await productsService.getAvailable());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      sendSuccess(res, await productsService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      sendSuccess(res, await productsService.create(req.body ?? {}), 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      sendSuccess(res, await productsService.update(req.params.id, req.body ?? {}));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      sendSuccess(res, await productsService.remove(req.params.id));
    } catch (error) {
      next(error);
    }
  },
};
