import { connectMongo } from './src/database/mongo-connection.js';
import { exitWithFatal, logger } from './src/logger/index.js';

process.on('uncaughtException', (error) => exitWithFatal('Excepción no controlada:', error));
process.on('unhandledRejection', (reason) => exitWithFatal('Promesa rechazada sin manejar:', reason));

const start = async () => {
  let config;
  try {
    ({ config } = await import('./src/config/index.js'));
  } catch (error) {
    return exitWithFatal('No se pudo arrancar ShipNow.', error);
  }

  try {
    await connectMongo(config.mongoUri);
  } catch (error) {
    return exitWithFatal('No se pudo conectar a MongoDB:', error);
  }

  const { default: app } = await import('./src/app.js');
  // Express 5 le pasa al callback el error de listen (por ejemplo, puerto ocupado).
  app.listen(config.port, (error) => {
    if (error) return exitWithFatal('No se pudo levantar el servidor HTTP:', error);
    logger.info(`Servidor ShipNow escuchando en el puerto ${config.port}`);
    logger.info(`Entorno ${config.nodeEnv}, logs desde el nivel ${config.logLevel}`);
  });
};

await start();
