import { fakerES as faker } from '@faker-js/faker';
import { DELIVERY_PRIORITY, ORDER_STATUS } from '../constants/index.js';
import { calculateOrderTotal } from '../utils/order-total.js';

const generateItem = () => ({
  name: faker.commerce.productName(),
  quantity: faker.number.int({ min: 1, max: 5 }),
  price: Number(faker.commerce.price({ min: 500, max: 50000 })),
});

export const generateOrder = ({ customerId = faker.database.mongodbObjectId() } = {}) => {
  const items = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, generateItem);
  return {
    _id: faker.database.mongodbObjectId(),
    customer: customerId,
    items,
    deliveryAddress: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    total: calculateOrderTotal(items),
    status: faker.helpers.arrayElement(Object.values(ORDER_STATUS)),
    priority: faker.helpers.arrayElement(Object.values(DELIVERY_PRIORITY)),
  };
};

export const generateOrders = (qty, customerIds = []) =>
  Array.from({ length: qty }, () =>
    generateOrder(customerIds.length ? { customerId: faker.helpers.arrayElement(customerIds) } : {})
  );
