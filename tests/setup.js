import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { connectMongo } from '../src/database/mongo-connection.js';

// Hooks globales de Mocha: corren alrededor de todos los archivos de tests/.
export const mochaHooks = {
  async beforeAll() {
    if (!config.isTest) throw new Error('Los tests tienen que correr con NODE_ENV=test (usá npm test).');

    await connectMongo(config.mongoUri);

    // Cada test vacía la base: si no es una base de test, se corta antes de borrar nada.
    const dbName = mongoose.connection.name;
    if (!dbName.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error(`La base "${dbName}" no parece de test: su nombre tiene que incluir "test". Revisá .env.test.`);
    }

    // Espera a que estén los índices únicos (email, code) para que los tests de duplicados sean confiables.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  },

  // Cada test arranca con la base vacía y crea sus propios datos: no dependen del orden ni de corridas anteriores.
  async beforeEach() {
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  },

  async afterAll() {
    if (mongoose.connection.readyState !== 1) return;
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  },
};
