import { DEFAULT_MOCK_QTY, MAX_MOCK_ITEMS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';

export const SEED_TYPES = ['users', 'drivers', 'orders', 'deliveries'];

const parseQuantity = (value, field) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number)) {
    throw new AppError('INVALID_MOCK_AMOUNT', { message: `"${field}" debe ser un número entero` });
  }
  if (number < 0) {
    throw new AppError('INVALID_MOCK_AMOUNT', { message: `"${field}" no puede ser negativo` });
  }
  if (number > MAX_MOCK_ITEMS) {
    throw new AppError('MOCK_LIMIT_EXCEEDED', { message: `"${field}" no puede ser mayor a ${MAX_MOCK_ITEMS}` });
  }
  return number;
};

export const parseGetQty = (qty) => {
  if (qty === undefined) return DEFAULT_MOCK_QTY;
  const number = parseQuantity(qty, 'qty');
  if (number === 0) throw new AppError('INVALID_MOCK_AMOUNT', { message: '"qty" debe ser mayor a 0' });
  return number;
};

export const parseSeedCounts = (query, body = {}) => {
  const qty = query.qty === undefined ? 0 : parseQuantity(query.qty, 'qty');
  const counts = Object.fromEntries(
    SEED_TYPES.map((type) => [type, body[type] === undefined ? qty : parseQuantity(body[type], type)])
  );

  if (Object.values(counts).every((count) => count === 0)) {
    throw new AppError('INVALID_MOCK_AMOUNT', {
      message: 'Indicá al menos una cantidad mayor a 0 (?qty=N o body { users, drivers, orders, deliveries })',
    });
  }
  if (counts.orders > 0 && counts.users === 0) {
    throw new AppError('MOCK_DEPENDENCIES_MISSING', {
      message: 'Para generar pedidos hace falta generar al menos un usuario (cliente)',
    });
  }
  if (counts.deliveries > 0 && (counts.orders === 0 || counts.drivers === 0)) {
    throw new AppError('MOCK_DEPENDENCIES_MISSING', {
      message: 'Para generar entregas hace falta generar al menos un pedido y un repartidor',
    });
  }
  return counts;
};
