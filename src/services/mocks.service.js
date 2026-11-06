import { MOCK_USER_PASSWORD, USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/index.js';
import { generateDeliveries } from '../mocks/deliveries.mock.js';
import { generateOrders } from '../mocks/orders.mock.js';
import { generateDrivers, generateUsers } from '../mocks/users.mock.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';
import { parseGetQty, parseSeedCounts } from '../validators/mock-quantities.validator.js';

const idsOf = (docs) => docs.map((doc) => doc._id);

const countsOf = (inserted) => Object.fromEntries(Object.entries(inserted).map(([type, ids]) => [type, ids.length]));

const rollback = async (inserted) => {
  try {
    await Promise.all([
      usersRepository.deleteByIds([...inserted.users, ...inserted.drivers]),
      ordersRepository.deleteByIds(inserted.orders),
      deliveriesRepository.deleteByIds(inserted.deliveries),
    ]);
    logger.error('Rollback del seed: se borró la carga parcial', { borrados: countsOf(inserted) });
    return 'Se deshizo la carga parcial';
  } catch (rollbackError) {
    logger.error('Rollback del seed: no se pudo borrar la carga parcial', {
      pendientes: countsOf(inserted),
      stack: rollbackError.stack,
    });
    return `No se pudo deshacer la carga parcial: ${rollbackError.message}`;
  }
};

export const mocksService = {
  getUsers: (qty) => generateUsers(parseGetQty(qty)),
  getDrivers: (qty) => generateDrivers(parseGetQty(qty)),
  getOrders: (qty) => generateOrders(parseGetQty(qty)),
  getDeliveries: (qty) => generateDeliveries(parseGetQty(qty)),

  async seed(query, body) {
    const counts = parseSeedCounts(query, body);
    const inserted = { users: [], drivers: [], orders: [], deliveries: [] };

    try {
      const password = await hashPassword(MOCK_USER_PASSWORD);
      const withPassword = (users) => users.map((user) => ({ ...user, password }));

      const users = withPassword(generateUsers(counts.users, { role: USER_ROLES.CUSTOMER }));
      inserted.users = idsOf(users);
      await usersRepository.insertMany(users);

      const drivers = withPassword(generateDrivers(counts.drivers));
      inserted.drivers = idsOf(drivers);
      await usersRepository.insertMany(drivers);

      const orders = generateOrders(counts.orders, inserted.users);
      inserted.orders = idsOf(orders);
      await ordersRepository.insertMany(orders);

      const deliveries = generateDeliveries(counts.deliveries, orders, inserted.drivers);
      inserted.deliveries = idsOf(deliveries);
      await deliveriesRepository.insertMany(deliveries);
    } catch (error) {
      const rollbackResult = await rollback(inserted);
      throw new AppError('MOCK_GENERATION_ERROR', { details: `${error.message}. ${rollbackResult}`, cause: error });
    }

    const insertedCounts = countsOf(inserted);
    logger.info('Seed de mocks generado', insertedCounts);
    return insertedCounts;
  },
};
