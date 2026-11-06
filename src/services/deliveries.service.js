import { DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';

export const deliveriesService = {
  getAll: () => deliveriesRepository.findAll(),

  async getById(id) {
    const delivery = await deliveriesRepository.findById(id);
    if (!delivery) throw new AppError('DELIVERY_NOT_FOUND');
    return delivery;
  },

  async create({ order: orderId, driver: driverId }) {
    if (!orderId) throw new AppError('VALIDATION_ERROR', { message: 'El campo "order" es obligatorio' });
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', { message: 'El pedido de la entrega no existe' });

    if (driverId) {
      const driver = await usersRepository.findById(driverId);
      if (driver?.role !== USER_ROLES.DRIVER) throw new AppError('DRIVER_NOT_FOUND');
      if (driver.isAvailable === false) throw new AppError('DRIVER_NOT_AVAILABLE');
    }
    return deliveriesRepository.create({
      order: order._id,
      driver: driverId,
      status: driverId ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING,
      priority: order.priority,
    });
  },
};
