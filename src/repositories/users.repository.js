import { UserModel } from '../models/user.model.js';
import { findPage } from './find-page.js';

const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

export const usersRepository = {
  create: (data) => UserModel.create(data),
  insertMany: (users) => UserModel.insertMany(users),
  findPage: (filter, pagination) => findPage(UserModel, filter, pagination),
  findById: (id) => UserModel.findById(id),
  findIdByEmail: (email) => UserModel.exists({ email: String(email).toLowerCase().trim() }),
  updateById: (id, data) => UserModel.findByIdAndUpdate(id, data, UPDATE_OPTIONS),
  addDocument: (id, document) => UserModel.findByIdAndUpdate(id, { $push: { documents: document } }, UPDATE_OPTIONS),
  deleteById: (id) => UserModel.findByIdAndDelete(id),
  deleteByIds: (ids) => UserModel.deleteMany({ _id: { $in: ids } }),
};
