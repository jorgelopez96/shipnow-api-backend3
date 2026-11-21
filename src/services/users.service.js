import { DOCUMENT_TYPES, USER_DOCUMENT_TYPES, USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/index.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';
import { readEnumFilter, readPagination } from '../utils/list-query.js';
import { pickFields } from '../utils/pick-fields.js';
import { removeFile, storeFile, withUploadedFile } from '../utils/uploaded-files.js';

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
  getAll: (query) => usersRepository.findPage(readEnumFilter(query, 'role', Object.values(USER_ROLES)), readPagination(query)),

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

  async remove(id) {
    const user = ensureFound(await usersRepository.deleteById(id));
    await Promise.all(user.documents.map((document) => removeFile(document.path)));
    return user;
  },

  addDocument: (id, file, type = DOCUMENT_TYPES.USER_DOCUMENT) =>
    withUploadedFile(file, async () => {
      if (!USER_DOCUMENT_TYPES.includes(type)) {
        throw new AppError('INVALID_DOCUMENT_TYPE', { details: `Tipos válidos: ${USER_DOCUMENT_TYPES.join(', ')}` });
      }
      const user = ensureFound(await usersRepository.findById(id));
      if (type === DOCUMENT_TYPES.DRIVER_LICENSE && user.role !== USER_ROLES.DRIVER) {
        throw new AppError('INVALID_DOCUMENT_TYPE', { message: 'Solo los repartidores pueden cargar una licencia de conducir' });
      }

      const document = await storeFile(file, type);
      const updated = ensureFound(await usersRepository.addDocument(id, document));
      logger.info(`Documento cargado al usuario ${id}`, { type, mimeType: document.mimeType, size: document.size });
      return updated;
    }),
};
