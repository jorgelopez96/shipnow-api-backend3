import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { swaggerSpecs } from './docs/swagger.config.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { httpLogger } from './middlewares/http-logger.middleware.js';
import deliveriesRouter from './routes/deliveries.router.js';
import loggerTestRouter from './routes/logger-test.router.js';
import mocksRouter from './routes/mocks.router.js';
import ordersRouter from './routes/orders.router.js';
import productsRouter from './routes/products.router.js';
import usersRouter from './routes/users.router.js';

const app = express();

app.use(httpLogger);
app.use(express.json());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);

if (!config.isProduction) {
  app.use('/api/mocks', mocksRouter);
  app.use('/api/loggerTest', loggerTestRouter);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
