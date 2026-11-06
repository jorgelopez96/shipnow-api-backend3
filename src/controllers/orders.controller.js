import { ordersService } from '../services/orders.service.js';
import { sendSuccess } from '../utils/send-success.js';

export const ordersController = {
  async getAll(req, res, next) {
    try {
      sendSuccess(res, await ordersService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      sendSuccess(res, await ordersService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      sendSuccess(res, await ordersService.create(req.body ?? {}), 201);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      sendSuccess(res, await ordersService.updateStatus(req.params.id, req.body?.status));
    } catch (error) {
      next(error);
    }
  },
};
