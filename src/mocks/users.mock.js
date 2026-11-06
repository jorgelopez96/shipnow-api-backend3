import { fakerES as faker } from '@faker-js/faker';
import { USER_ROLES } from '../constants/index.js';

const toEmailPart = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const uniqueEmail = (firstName, lastName, index) =>
  `${toEmailPart(firstName)}.${toEmailPart(lastName)}.${Date.now().toString(36)}${index}@shipnow.test`;

export const generateUser = ({ role = faker.helpers.arrayElement(Object.values(USER_ROLES)), index = 0 } = {}) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const user = {
    _id: faker.database.mongodbObjectId(),
    firstName,
    lastName,
    email: uniqueEmail(firstName, lastName, index),
    role,
  };
  if (role === USER_ROLES.DRIVER) user.isAvailable = faker.datatype.boolean();
  return user;
};

export const generateDriver = ({ index = 0 } = {}) => generateUser({ role: USER_ROLES.DRIVER, index });

export const generateUsers = (qty, options = {}) =>
  Array.from({ length: qty }, (_, index) => generateUser({ ...options, index }));

export const generateDrivers = (qty) => Array.from({ length: qty }, (_, index) => generateDriver({ index }));
