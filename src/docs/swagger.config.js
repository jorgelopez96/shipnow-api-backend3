import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config/index.js';

const docsDir = fileURLToPath(new URL('.', import.meta.url)).replaceAll('\\', '/');

const businessTags = [
  { name: 'Users', description: 'Usuarios: clientes, repartidores, comercios y administradores' },
  { name: 'Products', description: 'Catálogo de productos' },
  { name: 'Orders', description: 'Pedidos de los clientes y sus cambios de estado' },
  { name: 'Deliveries', description: 'Entregas asociadas a un pedido y a un repartidor' },
];

const devTags = [
  { name: 'Mocks', description: 'Herramienta de desarrollo: genera datos falsos y los carga en MongoDB' },
  { name: 'Logger', description: 'Herramienta de validación del logger, no es una funcionalidad de negocio' },
];

const businessFiles = ['schemas', 'users', 'products', 'orders', 'deliveries'];
const devFiles = ['mocks', 'logger'];

// En producción no existen /api/mocks ni /api/loggerTest, así que tampoco se documentan.
const tags = config.isProduction ? businessTags : [...businessTags, ...devTags];
const files = config.isProduction ? businessFiles : [...businessFiles, ...devFiles];

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShipNow API',
      version: '1.0.0',
      description: [
        'API de logística de ShipNow: usuarios, productos, pedidos y entregas, más herramientas de desarrollo (mocks y logger).',
        '',
        'Las respuestas exitosas tienen la forma `{ status: "success", payload }` y los errores `{ status: "error", statusCode, error, message, details? }`.',
        '`details` solo aparece fuera de producción.',
        '',
        'Los módulos **Mocks** y **Logger** solo existen cuando `NODE_ENV` no es `production`.',
      ].join('\n'),
    },
    servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
    tags,
  },
  apis: files.map((file) => `${docsDir}${file}.yaml`),
};

export const swaggerSpecs = swaggerJSDoc(swaggerOptions);
