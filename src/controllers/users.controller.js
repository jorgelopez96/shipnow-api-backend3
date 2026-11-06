import { usersService } from '../services/users.service.js';
import { sendSuccess } from '../utils/send-success.js';

export const usersController = {
  async getAll(req, res, next) {
    try {
      sendSuccess(res, await usersService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      sendSuccess(res, await usersService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      sendSuccess(res, await usersService.create(req.body ?? {}), 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      sendSuccess(res, await usersService.update(req.params.id, req.body ?? {}));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      sendSuccess(res, await usersService.remove(req.params.id));
    } catch (error) {
      next(error);
    }
  },
};
