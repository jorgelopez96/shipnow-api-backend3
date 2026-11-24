import {
  CLOSED_DELIVERY_STATUSES,
  CLOSED_ORDER_STATUSES,
  DELIVERY_STATUS,
  DELIVERY_STATUS_WITHOUT_DRIVER,
  DELIVERY_TO_ORDER_STATUS,
  USER_ROLES,
} from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/index.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { readEnumFilter, readPagination } from '../utils/list-query.js';

const ensureAvailableDriver = async (driverId) => {
  const driver = await usersRepository.findById(driverId);
  if (driver?.role !== USER_ROLES.DRIVER) throw new AppError('DRIVER_NOT_FOUND');
  if (driver.isAvailable === false) throw new AppError('DRIVER_NOT_AVAILABLE');
};

export const deliveriesService = {
  getAll: (query) =>
    deliveriesRepository.findPage(readEnumFilter(query, 'status', Object.values(DELIVERY_STATUS)), readPagination(query)),

  async getById(id) {
    const delivery = await deliveriesRepository.findById(id);
    if (!delivery) throw new AppError('DELIVERY_NOT_FOUND');
    return delivery;
  },

  async create({ order: orderId, driver: driverId }) {
    if (!orderId) throw new AppError('VALIDATION_ERROR', { message: 'El campo "order" es obligatorio' });
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', { message: 'El pedido de la entrega no existe' });

    if (driverId) await ensureAvailableDriver(driverId);
    const status = driverId ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING;
    return deliveriesRepository.create({ order: order._id, driver: driverId, status, priority: order.priority, history: [{ status }] });
  },

  // Tracking: avanza la entrega, registra el cambio en su historial y deja el pedido en el estado equivalente.
  async updateStatus(id, { status, driver: driverId }) {
    if (!Object.values(DELIVERY_STATUS).includes(status)) {
      throw new AppError('INVALID_DELIVERY_STATUS', { details: `Estados válidos: ${Object.values(DELIVERY_STATUS).join(', ')}` });
    }
    const delivery = await deliveriesRepository.findById(id);
    if (!delivery) throw new AppError('DELIVERY_NOT_FOUND');
    if (CLOSED_DELIVERY_STATUSES.includes(delivery.status)) {
      throw new AppError('DELIVERY_ALREADY_CLOSED', { details: `Estado actual: ${delivery.status}` });
    }
    if (!delivery.order) throw new AppError('ORDER_NOT_FOUND', { message: 'El pedido de la entrega no existe' });
    if (CLOSED_ORDER_STATUSES.includes(delivery.order.status)) {
      throw new AppError('ORDER_ALREADY_CLOSED', { details: `Estado actual del pedido: ${delivery.order.status}` });
    }

    if (driverId) await ensureAvailableDriver(driverId);
    const driver = driverId ?? delivery.driver?._id;
    if (!driver && !DELIVERY_STATUS_WITHOUT_DRIVER.includes(status)) {
      throw new AppError('DRIVER_REQUIRED', { details: `Para pasar a "${status}" mandá "driver" en el body` });
    }

    // Primero el pedido, así la entrega devuelta ya lo trae populado con su estado nuevo.
    await ordersRepository.updateStatus(delivery.order._id, DELIVERY_TO_ORDER_STATUS[status]);
    const updated = await deliveriesRepository.updateStatus(id, { status, driver });
    logger.info(`Entrega ${id} cambió de estado: ${delivery.status} → ${status}`, { order: String(delivery.order._id) });
    return updated;
  },
};
