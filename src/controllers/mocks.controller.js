import { mocksService } from '../services/mocks.service.js';
import { sendSuccess } from '../utils/send-success.js';

const sendMocks = (generate) => (req, res, next) => {
  try {
    sendSuccess(res, generate(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const mocksController = {
  getUsers: sendMocks(mocksService.getUsers),
  getDrivers: sendMocks(mocksService.getDrivers),
  getOrders: sendMocks(mocksService.getOrders),
  getDeliveries: sendMocks(mocksService.getDeliveries),

  async seed(req, res, next) {
    try {
      sendSuccess(res, await mocksService.seed(req.query, req.body ?? {}), 201);
    } catch (error) {
      next(error);
    }
  },
};
