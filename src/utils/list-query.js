import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';

const invalidParam = (name, details) => new AppError('INVALID_QUERY_PARAM', { message: `El parámetro "${name}" no es válido`, details });

const readPositiveInteger = (query, name, fallback) => {
  const value = query[name];
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw invalidParam(name, `Tiene que ser un entero mayor a 0 (llegó "${value}")`);
  return number;
};

// ?page y ?limit. Sin parámetros devuelve la primera página con DEFAULT_PAGE_LIMIT resultados.
export const readPagination = (query = {}) => {
  const page = readPositiveInteger(query, 'page', 1);
  const limit = readPositiveInteger(query, 'limit', DEFAULT_PAGE_LIMIT);
  if (limit > MAX_PAGE_LIMIT) throw invalidParam('limit', `El máximo es ${MAX_PAGE_LIMIT} (llegó ${limit})`);
  return { page, limit };
};

// Filtro opcional por un campo con valores fijos (rol, estado). Si no viene el parámetro, no filtra.
export const readEnumFilter = (query = {}, name, allowed) => {
  const value = query[name];
  if (value === undefined || value === '') return {};
  if (!allowed.includes(value)) throw invalidParam(name, `Valores válidos: ${allowed.join(', ')} (llegó "${value}")`);
  return { [name]: value };
};
