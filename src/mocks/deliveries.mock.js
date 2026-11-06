import { fakerES as faker } from '@faker-js/faker';
import { DELIVERY_STATUS_WITHOUT_DRIVER, ORDER_TO_DELIVERY_STATUS } from '../constants/index.js';
import { generateOrder } from './orders.mock.js';

export const generateDelivery = (order = generateOrder(), driverId = faker.database.mongodbObjectId()) => {
  const status = ORDER_TO_DELIVERY_STATUS[order.status];
  const delivery = {
    _id: faker.database.mongodbObjectId(),
    order: order._id,
    status,
    priority: order.priority,
  };
  if (!DELIVERY_STATUS_WITHOUT_DRIVER.includes(status)) delivery.driver = driverId;
  return delivery;
};

export const generateDeliveries = (qty, orders = [], driverIds = []) => {
  const deliveries = [];
  for (let i = 0; i < qty; i++) {
    const order = orders.length ? orders[i % orders.length] : undefined;
    const driverId = driverIds.length ? faker.helpers.arrayElement(driverIds) : undefined;
    deliveries.push(generateDelivery(order, driverId));
  }
  return deliveries;
};
