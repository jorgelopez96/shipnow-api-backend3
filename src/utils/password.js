import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../constants/index.js';

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
