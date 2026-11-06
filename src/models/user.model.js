import { Schema, model } from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

const hidePassword = (_doc, ret) => {
  delete ret.password;
  return ret;
};

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.CUSTOMER },
    isAvailable: { type: Boolean },
  },
  {
    timestamps: true,
    toJSON: { transform: hidePassword },
    toObject: { transform: hidePassword },
  }
);

export const UserModel = model('User', userSchema);
