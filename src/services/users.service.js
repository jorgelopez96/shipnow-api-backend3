import { AppError } from '../errors/app-error.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';
import { pickFields } from '../utils/pick-fields.js';

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'password', 'role', 'isAvailable'];

const ensureEmailIsFree = async (email, currentUserId) => {
  if (!email) return;
  const existing = await usersRepository.findIdByEmail(email);
  if (existing && String(existing._id) !== String(currentUserId)) {
    throw new AppError('USER_ALREADY_EXISTS', { details: `Email: ${email}` });
  }
};

const withHashedPassword = async (data) => {
  if (data.password === undefined) return data;
  if (typeof data.password !== 'string' || data.password.trim() === '') throw new AppError('PASSWORD_REQUIRED');
  return { ...data, password: await hashPassword(data.password) };
};

const ensureFound = (user) => {
  if (!user) throw new AppError('USER_NOT_FOUND');
  return user;
};

export const usersService = {
  getAll: () => usersRepository.findAll(),

  getById: async (id) => ensureFound(await usersRepository.findById(id)),

  async create(data) {
    if (!data.password) throw new AppError('PASSWORD_REQUIRED');
    const user = pickFields(data, EDITABLE_FIELDS);
    await ensureEmailIsFree(user.email);
    return usersRepository.create(await withHashedPassword(user));
  },

  async update(id, data) {
    const changes = pickFields(data, EDITABLE_FIELDS);
    await ensureEmailIsFree(changes.email, id);
    return ensureFound(await usersRepository.updateById(id, await withHashedPassword(changes)));
  },

  remove: async (id) => ensureFound(await usersRepository.deleteById(id)),
};
