import mongoose from 'mongoose';
import { logger, toErrorEntry } from '../logger/index.js';
import { maskMongoUri } from '../utils/mask-mongo-uri.js';

const watchConnection = () => {
  mongoose.connection.on('disconnected', () => logger.warning('Se perdió la conexión con MongoDB'));
  mongoose.connection.on('reconnected', () => logger.info('Se recuperó la conexión con MongoDB'));
  mongoose.connection.on('error', (error) => logger.error(...toErrorEntry('Error en la conexión con MongoDB:', error)));
};

export const connectMongo = async (uri) => {
  await mongoose.connect(uri);
  logger.info(`Conectado a MongoDB en ${maskMongoUri(uri)}`);
  watchConnection();
};
