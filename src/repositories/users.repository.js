import { UserModel } from '../models/user.model.js';

const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

export const usersRepository = {
  create: (data) => UserModel.create(data),
  insertMany: (users) => UserModel.insertMany(users),
  findAll: (filter = {}) => UserModel.find(filter),
  findById: (id) => UserModel.findById(id),
  findIdByEmail: (email) => UserModel.exists({ email: String(email).toLowerCase().trim() }),
  updateById: (id, data) => UserModel.findByIdAndUpdate(id, data, UPDATE_OPTIONS),
  deleteById: (id) => UserModel.findByIdAndDelete(id),
  deleteByIds: (ids) => UserModel.deleteMany({ _id: { $in: ids } }),
};
