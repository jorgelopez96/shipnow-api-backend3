import { deliveriesService } from '../services/deliveries.service.js';
import { sendSuccess } from '../utils/send-success.js';

export const deliveriesController = {
  async getAll(req, res, next) {
    try {
      sendSuccess(res, await deliveriesService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      sendSuccess(res, await deliveriesService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      sendSuccess(res, await deliveriesService.create(req.body ?? {}), 201);
    } catch (error) {
      next(error);
    }
  },
};
