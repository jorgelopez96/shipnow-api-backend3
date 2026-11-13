# ShipNow API

API de una plataforma de logística hecha con **Node.js**, **Express 5** (ES Modules) y **MongoDB + Mongoose**.

Incluye:

- **Arquitectura por capas** y configuración de entorno validada.
- **Mocking** con `@faker-js/faker` y carga de datos de prueba en MongoDB.
- **Manejo profesional de errores** con un diccionario de errores y un middleware global.
- **Logging y monitoreo básico** con Winston (ver [Logging](#logging)).
- **Documentación interactiva** con Swagger en `/api/docs` (ver [Documentación con Swagger](#documentación-con-swagger)).

## Instalación

Requisitos: Node.js 20 o superior y una base MongoDB (local o en Atlas).

```bash
git clone <url-del-repo>
cd <carpeta-del-repo>
npm install
cp .env.example .env   # después completá los valores
```

## Variables de entorno

| Variable      | Obligatoria | Default | Descripción                                                    |
| ------------- | ----------- | ------- | -------------------------------------------------------------- |
| `MONGODB_URI` | Sí          | -       | Cadena de conexión a MongoDB                                   |
| `NODE_ENV`    | Sí          | -       | `development` o `production`. En `production` no hay mocks     |
| `PORT`        | No          | `8080`  | Puerto del servidor (entero entre 1 y 65535)                   |
| `LOG_LEVEL`   | No          | Según `NODE_ENV` | Nivel mínimo de los logs de consola (ver [Logging](#logging)) |

Solo la carpeta `src/config/` lee `process.env`. `env.loader.js` lee y valida las variables sin tirar errores, y `index.js` exporta el objeto `config` congelado, o tira un error si algo está mal. Si falta una obligatoria o tiene un valor inválido, la app no arranca y el motivo queda registrado como `fatal`:

```
2026-11-06 11:38:16 [fatal] No se pudo arrancar ShipNow. Configuración inválida: NODE_ENV debe ser development o production (llegó "staging"). Revisá tu .env (podés partir de .env.example).
```

## Cómo correr

```bash
npm run dev   # desarrollo, con nodemon
npm start     # node server.js
```

Con el servidor levantado, la documentación queda en `http://localhost:8080/api/docs` (o el puerto que tenga `PORT`).

## Documentación con Swagger

La API está documentada con **OpenAPI 3.0**: `swagger-jsdoc` arma la especificación y `swagger-ui-express` la muestra en **`/api/docs`**, desde donde se puede leer cada endpoint y probarlo con **Try it out**.

### Cómo está organizada

La configuración está separada de las rutas: los routers no tienen nada de Swagger.

```
src/docs/
├── swagger.config.js  Información general (nombre, versión, descripción, servidor local), tags y archivos a leer
├── schemas.yaml       Schemas, parámetros y respuestas de error que se reutilizan con $ref
├── users.yaml         Users
├── products.yaml      Products
├── orders.yaml        Orders
├── deliveries.yaml    Deliveries
├── mocks.yaml         Mocks
└── logger.yaml        Logger
```

`app.js` solo monta la ruta: `app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs))`. La URL del servidor local sale de `config.port`, así siempre coincide con el puerto real.

### Qué está documentado

| Tag            | Endpoints                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Users**      | `GET`/`POST /api/users`, `GET`/`PUT`/`DELETE /api/users/{id}`                                   |
| **Products**   | `GET`/`POST /api/products`, `GET`/`PUT`/`DELETE /api/products/{id}`                             |
| **Orders**     | `GET`/`POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/status`               |
| **Deliveries** | `GET`/`POST /api/deliveries`, `GET /api/deliveries/{id}`                                        |
| **Mocks**      | `GET /api/mocks/mockingusers`, `/mockingorders`, `/drivers`, `/deliveries` (y sus alias), `POST /api/mocks/generateData` (y `/seed`) |
| **Logger**     | `GET /api/loggerTest`, aclarado como herramienta de validación y no de negocio                  |

Cada endpoint tiene método, ruta, descripción, parámetros de ruta y de query, body esperado con ejemplo, respuesta exitosa y cada error que puede devolver, con el código del [diccionario de errores](#diccionario-de-errores).

**Schemas reutilizables:** `User`, `Product`, `Order`, `OrderItem`, `Delivery`, `SuccessResponse` y `ErrorResponse`, más los resúmenes que aparecen cuando una respuesta viene con `populate` (`CustomerSummary`, `OrderSummary`, `DriverSummary`) y `SeedCounts` para la carga de mocks. Los errores que se repiten (`InvalidId`, `InternalError`, `UserNotFound`, `OrderNotFound`, etc.) también están definidos una sola vez.

### Aclaraciones para probar

- **Mocks y Logger solo existen fuera de producción.** Con `NODE_ENV=production` esas rutas devuelven `404` y tampoco aparecen en Swagger, para que la documentación muestre siempre lo que la API de verdad responde.
- **No hay autenticación**, así que no hay errores `401`/`403` documentados.
- `details` en los errores solo aparece fuera de producción.
- Para tener datos con los que probar, conviene empezar por `POST /api/mocks/generateData` con `{ "users": 5, "drivers": 2, "orders": 10, "deliveries": 3 }` y después usar los IDs que devuelven `GET /api/users` y `GET /api/orders`.
- Los IDs se validan: uno con formato inválido (por ejemplo `123`) devuelve `400 INVALID_ID`, y uno con formato válido que no existe devuelve el `404` del recurso.
- En `POST /api/orders` y `POST /api/deliveries` la respuesta trae los IDs relacionados tal cual. En los `GET` vienen populados (cliente, pedido y repartidor).

## Estructura por capas

```
server.js              Conecta a MongoDB y levanta el servidor
src/
├── app.js             Express, routers y middleware de errores (siempre al final)
├── config/            Variables de entorno validadas
├── logger/            Logger de Winston: niveles, formatos y transportes
├── database/          Conexión a MongoDB y sus eventos
├── constants/         Roles, estados, prioridades y límites
├── routes/            Solo definen rutas y delegan al controller
├── controllers/       Reciben req/res, llaman al service y responden (errores → next)
├── services/          Lógica de negocio (no conocen req ni res)
├── validators/        Validación de las cantidades de los mocks
├── repositories/      Única capa que habla con Mongoose
├── models/            Schemas de Product, User, Order y Delivery
├── mocks/             Generadores de datos falsos con @faker-js/faker (locale es)
├── docs/              Configuración de Swagger y documentación OpenAPI en YAML
├── errors/            Diccionario de errores y clase AppError
├── middlewares/       Middleware global de errores, de rutas inexistentes y de logs HTTP
└── utils/             Hash de contraseñas, total del pedido, respuesta de éxito, selección de campos y enmascarado de la URI
```

```
Request → Router → Controller → Service → Repository → Model → MongoDB
```

- **Router:** conecta cada ruta con su método del controller, sin lógica.
- **Controller:** única puerta de entrada HTTP. Lee `req`, llama al service, responde y deriva los errores a `next(error)`. No conoce Mongoose.
- **Service:** reglas de negocio, sin `req`/`res`. Por ejemplo, calcula el estado del producto según el stock, valida emails duplicados, hashea contraseñas y controla los cambios de estado de un pedido.
- **Repository:** único lugar que usa Mongoose. Aplica orden por defecto, `populate` y validaciones en los updates.
- **Model:** solo define el esquema.

Fuera de la cadena de un request, Mongoose aparece en dos lugares de infraestructura: la conexión (`src/database/mongo-connection.js`) y el middleware de errores, que reconoce los errores de Mongoose para traducirlos al diccionario.

### ¿Por qué separar Service y Repository?

El service decide **qué** hay que hacer (las reglas del negocio) y el repository sabe **cómo** se guardan y se leen los datos. Así las reglas no dependen de Mongoose: si mañana cambia la base o la forma de consultarla, solo se toca el repository. Las reglas quedan en un solo lugar, más fáciles de leer y de probar.

## Formato de las respuestas

Todas las respuestas exitosas tienen la misma forma:

```json
{ "status": "success", "payload": {} }
```

Los errores usan el formato del diccionario (ver [Errores](#errores)).

## Endpoints

### Productos

| Método | Ruta                 | Descripción                                                     |
| ------ | -------------------- | --------------------------------------------------------------- |
| GET    | `/api/products`      | Lista los productos con stock                                   |
| GET    | `/api/products/:id`  | Obtiene un producto (`404 PRODUCT_OUT_OF_STOCK` si no hay stock) |
| POST   | `/api/products`      | Crea un producto                                                |
| PUT    | `/api/products/:id`  | Actualiza un producto                                           |
| DELETE | `/api/products/:id`  | Elimina un producto y lo devuelve                               |

Campos: `title`, `description`, `code` (único), `price`, `stock` y `category`, todos obligatorios. El `status` (`available` / `out_of_stock`) no se manda: lo calcula el servidor según el stock, al crear y cada vez que se actualiza el stock.

### Usuarios

| Método | Ruta              | Descripción                                                          |
| ------ | ----------------- | -------------------------------------------------------------------- |
| GET    | `/api/users`      | Lista los usuarios                                                   |
| GET    | `/api/users/:id`  | Obtiene un usuario                                                   |
| POST   | `/api/users`      | Crea un usuario (la contraseña se hashea con bcrypt)                 |
| PUT    | `/api/users/:id`  | Actualiza un usuario (si cambia la contraseña, se vuelve a hashear) |
| DELETE | `/api/users/:id`  | Elimina un usuario y lo devuelve                                     |

Campos: `firstName`, `lastName`, `email` (único), `password`, `role` (`customer` por defecto, `driver`, `store` o `admin`) e `isAvailable` (para los repartidores). No se puede usar un email que ya tenga otro usuario.

**La contraseña nunca sale de la API.** El schema de `User` tiene un `transform` en `toJSON` y `toObject` que la borra, así que se oculta en cualquier salida del modelo (`find`, `create`, `insertMany`) sin que cada capa tenga que acordarse. Se eligió esto y no `select: false` porque `create()` e `insertMany()` devuelven el documento con la contraseña igual, y habría que limpiarla a mano en cada lugar. Por eso el repository de usuarios no usa `.lean()`, que saltearía el transform.

### Pedidos y entregas

| Método | Ruta                       | Descripción                                                                                   |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/api/orders`              | Lista los pedidos con los datos del cliente                                                   |
| GET    | `/api/orders/:id`          | Obtiene un pedido                                                                             |
| POST   | `/api/orders`              | Crea un pedido. El total se calcula desde los items y el cliente tiene que existir           |
| PATCH  | `/api/orders/:id/status`   | Cambia el estado (`{ "status": "in_transit" }`). Un pedido entregado o cancelado ya no cambia |
| GET    | `/api/deliveries`          | Lista las entregas con su pedido y repartidor                                                 |
| GET    | `/api/deliveries/:id`      | Obtiene una entrega                                                                           |
| POST   | `/api/deliveries`          | Crea una entrega. El pedido tiene que existir y el repartidor tener rol `driver` y estar disponible |

## Mocking

El router `/api/mocks` solo se monta si `NODE_ENV` **no** es `production`.

### Datos simulados (no se guardan en la base)

Todos aceptan `?qty=N`: un entero de 1 a 100, y si no se manda, se generan 10.

| Método | Ruta                       | Devuelve                                      |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/api/mocks/users`         | Usuarios con cualquier rol válido             |
| GET    | `/api/mocks/mockingusers`  | Alias de `/users`                             |
| GET    | `/api/mocks/drivers`       | Usuarios con rol `driver` e `isAvailable`     |
| GET    | `/api/mocks/orders`        | Pedidos con items, total, estado y prioridad  |
| GET    | `/api/mocks/mockingorders` | Alias de `/orders`                            |
| GET    | `/api/mocks/deliveries`    | Entregas asociadas a un pedido                |

Ejemplo: `GET /api/mocks/users?qty=2`

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "2a4b7c7553dd3cab44cf79a1",
      "firstName": "Cristián",
      "lastName": "Abreu Meléndez",
      "email": "cristian.abreumelendez.mw51wk7m0@shipnow.test",
      "role": "store"
    },
    {
      "_id": "fb18ae6ff1df1ceacaf0dc2d",
      "firstName": "Teodoro",
      "lastName": "Lomeli Delgado",
      "email": "teodoro.lomelidelgado.mvd9p08l0@shipnow.test",
      "role": "driver",
      "isAvailable": true
    }
  ]
}
```

Ejemplo: `GET /api/mocks/orders?qty=1`

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "7f40e61bfeafeccd1caa77be",
      "customer": "0f3b3bdec820cdc28dacc227",
      "items": [{ "name": "Ordenador Inteligente de Algodón", "quantity": 4, "price": 2154.49 }],
      "deliveryAddress": "Quinta Catalina Batista Adorno, 84, Puertollano",
      "total": 8617.96,
      "status": "in_transit",
      "priority": "high"
    }
  ]
}
```

Ejemplo: `GET /api/mocks/deliveries?qty=1`

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "dde7ca7dca1ace7304bd58ca",
      "order": "0abccf6c1f69b7faae4a5226",
      "status": "delivered",
      "priority": "normal",
      "driver": "7da6f4ac3a6cca8651235362"
    }
  ]
}
```

Los usuarios simulados no tienen contraseña.

### Carga de datos de prueba (se guardan en MongoDB)

| Método | Ruta                       |
| ------ | -------------------------- |
| POST   | `/api/mocks/seed`          |
| POST   | `/api/mocks/generateData`  |

Las cantidades se pueden pasar de dos maneras:

- `?qty=N` genera **N de cada tipo**: N usuarios, N repartidores, N pedidos y N entregas.
- Por body JSON, cada tipo por separado: `{ "users": 5, "drivers": 2, "orders": 8, "deliveries": 3 }`. Lo que venga en el body tiene prioridad sobre `qty`, y lo que no venga toma el valor de `qty`, o 0 si tampoco se mandó.

```bash
curl -X POST "http://localhost:8080/api/mocks/seed?qty=10"

curl -X POST http://localhost:8080/api/mocks/generateData \
  -H "Content-Type: application/json" \
  -d '{ "users": 5, "drivers": 2, "orders": 8, "deliveries": 3 }'
```

Respuesta (`201`), con las cantidades insertadas de cada tipo:

```json
{ "status": "success", "payload": { "users": 5, "drivers": 2, "orders": 8, "deliveries": 3 } }
```

**Cómo se insertan:** primero los usuarios (rol `customer`) y los repartidores (rol `driver`). Después los pedidos, cada uno con uno de esos clientes recién creados. Por último las entregas: cada una va asociada a uno de esos pedidos y, cuando corresponde, a un repartidor recién creado.

**Validaciones:** cada cantidad tiene que ser un entero entre 0 y 100 (`MAX_MOCK_ITEMS`) y al menos una tiene que ser mayor a 0. Para generar pedidos hacen falta usuarios, y para generar entregas hacen falta pedidos y repartidores. Si la carga en MongoDB falla a mitad de camino, se borra lo que ya se había insertado en ese seed.

### Reglas de los datos generados

- Tienen la misma estructura que los modelos `User`, `Order` y `Delivery`.
- Los roles, estados y prioridades salen siempre de `src/constants` (`USER_ROLES`, `ORDER_STATUS`, `DELIVERY_STATUS`, `DELIVERY_PRIORITY`).
- El `total` del pedido se calcula a partir de sus items.
- El estado y la prioridad de la entrega salen de su pedido. Por ejemplo, un pedido `in_transit` tiene una entrega `in_transit`.
- Las entregas `pending` y `cancelled` no tienen repartidor. Las demás tienen uno real con rol `driver`.
- Los emails son únicos, así se pueden hacer varias cargas sin romper el índice `unique`.
- Todos los usuarios cargados tienen la contraseña `coder123`, hasheada con bcrypt (10 salt rounds).

## Errores

Ninguna ruta ni controller responde errores por su cuenta. Cada capa detecta el problema y lanza un `AppError` con un código del diccionario. Por ejemplo, el service lanza `new AppError('ORDER_NOT_FOUND')`, el controller lo deriva con `next(error)` y la respuesta la arma únicamente el middleware global (`src/middlewares/error.middleware.js`).

### Estructura de la respuesta

```json
{
  "status": "error",
  "statusCode": 404,
  "error": "ORDER_NOT_FOUND",
  "message": "No se encontró el pedido solicitado"
}
```

- `statusCode`: el mismo status HTTP de la respuesta.
- `error`: código estable para usar desde el frontend, los tests o la documentación.
- `message`: explicación para el cliente.
- `details`: información extra para depurar. Solo aparece si `NODE_ENV` no es `production`.

El middleware también traduce los errores que no son `AppError`: validaciones de Mongoose (`VALIDATION_ERROR`), IDs mal formados (`INVALID_ID`), JSON roto (`INVALID_JSON`), claves duplicadas (`DUPLICATE_VALUE`) y fallas de MongoDB (`DATABASE_ERROR`). Cualquier otro error inesperado responde `INTERNAL_SERVER_ERROR` sin exponer detalles internos. El middleware es también el único lugar donde se loguean los errores de los requests (ver [Logging](#logging)).

### Diccionario de errores

Está en `src/errors/error-dictionary.js`.

| Código                      | HTTP | Cuándo                                                               |
| --------------------------- | ---- | -------------------------------------------------------------------- |
| `VALIDATION_ERROR`          | 400  | Faltan datos obligatorios o tienen un valor inválido                 |
| `INVALID_ID`                | 400  | El ID no tiene formato de ObjectId                                   |
| `INVALID_JSON`              | 400  | El body no es un JSON válido                                         |
| `ROUTE_NOT_FOUND`           | 404  | La ruta no existe                                                    |
| `DUPLICATE_VALUE`           | 409  | Se viola un índice único (por ejemplo, el `code` de un producto)     |
| `USER_NOT_FOUND`            | 404  | El usuario (o el cliente del pedido) no existe                       |
| `USER_ALREADY_EXISTS`       | 409  | Ya hay otro usuario con ese email                                    |
| `PASSWORD_REQUIRED`         | 400  | Se crea un usuario sin contraseña o se manda una contraseña vacía    |
| `PRODUCT_NOT_FOUND`         | 404  | El producto no existe                                                |
| `PRODUCT_OUT_OF_STOCK`      | 404  | Se pide un producto que no tiene stock                               |
| `ORDER_NOT_FOUND`           | 404  | El pedido no existe                                                  |
| `ORDER_ITEMS_REQUIRED`      | 400  | El pedido no tiene items                                             |
| `INVALID_ORDER_STATUS`      | 400  | El estado no es uno de `ORDER_STATUS`                                |
| `ORDER_ALREADY_CLOSED`      | 409  | Se intenta cambiar el estado de un pedido entregado o cancelado      |
| `DELIVERY_NOT_FOUND`        | 404  | La entrega no existe                                                 |
| `DRIVER_NOT_FOUND`          | 404  | El repartidor no existe o no tiene rol `driver`                      |
| `DRIVER_NOT_AVAILABLE`      | 409  | El repartidor tiene `isAvailable: false`                             |
| `INVALID_MOCK_AMOUNT`       | 400  | La cantidad no es un entero, es negativa o es 0                      |
| `MOCK_LIMIT_EXCEEDED`       | 400  | La cantidad supera `MAX_MOCK_ITEMS` (100)                            |
| `MOCK_DEPENDENCIES_MISSING` | 400  | Se piden pedidos sin usuarios, o entregas sin pedidos o repartidores |
| `MOCK_GENERATION_ERROR`     | 500  | Falló la carga en MongoDB. Se deshace lo insertado                   |
| `DATABASE_ERROR`            | 500  | MongoDB no responde                                                  |
| `INTERNAL_SERVER_ERROR`     | 500  | Error inesperado                                                     |

### Cómo probar los casos inválidos

Con la API corriendo en desarrollo (`npm run dev`):

```bash
# Productos
curl http://localhost:8080/api/products/abc                          # 400 INVALID_ID
curl http://localhost:8080/api/products/507f1f77bcf86cd799439011     # 404 PRODUCT_NOT_FOUND
curl http://localhost:8080/api/products/<id-sin-stock>               # 404 PRODUCT_OUT_OF_STOCK
curl -X POST http://localhost:8080/api/products -H "Content-Type: application/json" -d '{"title":"Caja"}'  # 400 VALIDATION_ERROR
curl -X POST http://localhost:8080/api/products -H "Content-Type: application/json" \
  -d '{"title":"Otra","description":"d","code":"<code-existente>","price":1,"stock":1,"category":"x"}'    # 409 DUPLICATE_VALUE

# Usuarios
curl http://localhost:8080/api/users/507f1f77bcf86cd799439011        # 404 USER_NOT_FOUND
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" \
  -d '{"firstName":"Ana","lastName":"Paz","email":"ana@test.com"}'   # 400 PASSWORD_REQUIRED
curl -X PUT http://localhost:8080/api/users/<id> -H "Content-Type: application/json" -d '{"email":"<email-de-otro>"}'  # 409 USER_ALREADY_EXISTS
curl -X PUT http://localhost:8080/api/users/<id> -H "Content-Type: application/json" -d '{"role":"jefe"}'             # 400 VALIDATION_ERROR

# Pedidos y entregas
curl -X POST http://localhost:8080/api/orders -H "Content-Type: application/json" \
  -d '{"customer":"507f1f77bcf86cd799439011","items":[{"name":"Caja","quantity":1,"price":10}],"deliveryAddress":"Calle 1"}'  # 404 USER_NOT_FOUND
curl -X PATCH http://localhost:8080/api/orders/<id>/status -H "Content-Type: application/json" -d '{"status":"on_the_way"}'  # 400 INVALID_ORDER_STATUS
curl -X POST http://localhost:8080/api/deliveries -H "Content-Type: application/json" -d '{"order":"<id>","driver":"<id-de-un-customer>"}'  # 404 DRIVER_NOT_FOUND

# Mocks
curl "http://localhost:8080/api/mocks/users?qty=abc"        # 400 INVALID_MOCK_AMOUNT (no es un número)
curl "http://localhost:8080/api/mocks/users?qty=-5"         # 400 INVALID_MOCK_AMOUNT (negativo)
curl "http://localhost:8080/api/mocks/orders?qty=0"         # 400 INVALID_MOCK_AMOUNT (tiene que ser mayor a 0)
curl "http://localhost:8080/api/mocks/drivers?qty=500"      # 400 MOCK_LIMIT_EXCEEDED
curl -X POST http://localhost:8080/api/mocks/seed           # 400 INVALID_MOCK_AMOUNT (sin cantidades)
curl -X POST http://localhost:8080/api/mocks/seed -H "Content-Type: application/json" -d '{"orders":3}'  # 400 MOCK_DEPENDENCIES_MISSING
curl -X POST http://localhost:8080/api/mocks/seed -H "Content-Type: application/json" -d '{users:'       # 400 INVALID_JSON

# Otros
curl http://localhost:8080/api/ruta-que-no-existe           # 404 ROUTE_NOT_FOUND
```

**Falla de MongoDB durante el seed:** con la API corriendo, detené MongoDB (en Windows, `net stop MongoDB` como administrador) y ejecutá `curl -X POST "http://localhost:8080/api/mocks/seed?qty=5"`. Después de unos segundos responde `500 MOCK_GENERATION_ERROR` en lugar de romperse. Si la falla ocurre a mitad de la carga, el seed borra lo que ya había insertado para no dejar datos a medias.

## Logging

Los logs se manejan con **[Winston](https://github.com/winstonjs/winston)** y rotan por día con **winston-daily-rotate-file**. Todo el proyecto importa el logger desde `src/logger/index.js`, y en `src/` no queda ningún `console.*`.

```
src/logger/
├── index.js                     Entrada pública: crea el logger y exporta logger, exitWithFatal y toErrorEntry
├── levels.js                    Niveles y colores
├── formats.js                   Formato de línea, con colores (consola) o sin colores (archivo)
├── redact-sensitive.format.js   Oculta datos sensibles antes de escribir
├── transports.js                Consola y archivo de errores con rotación
└── error-entry.js               Arma el mensaje y el stack de un error
```

### Niveles

| Nivel     | Número | Uso                                                                              |
| --------- | ------ | -------------------------------------------------------------------------------- |
| `fatal`   | 0      | La app no puede seguir: configuración inválida, MongoDB caído al arrancar        |
| `error`   | 1      | Errores 500 de los requests, rollback del seed, errores de la conexión           |
| `warning` | 2      | Errores 4xx de los requests, rutas inexistentes, desconexión de MongoDB          |
| `info`    | 3      | Arranque, conexión a MongoDB, seed generado, pedidos creados y cambios de estado |
| `http`    | 4      | Una línea por request: método, URL, status y duración                            |
| `debug`   | 5      | Detalle para desarrollo                                                          |

En Winston, **un número más bajo es más grave**, y un nivel registra ese nivel y todos los más graves. Por ejemplo, con `info` se ven `info`, `warning`, `error` y `fatal`, pero no `http` ni `debug`.

### Comportamiento por entorno

| `NODE_ENV`    | Consola desde | Colores |
| ------------- | ------------- | ------- |
| `development` | `debug`       | Sí      |
| `production`  | `info`        | No      |

Con `LOG_LEVEL` se puede cambiar el nivel de la consola (por ejemplo, `LOG_LEVEL=warning`). Si tiene un valor que no es un nivel, la app no arranca.

Cada línea tiene el formato `YYYY-MM-DD HH:mm:ss [nivel] mensaje`. Si hay metadata va después, en JSON, y si es un error el stack trace va en las líneas siguientes.

```
2026-11-06 11:36:44 [info] Servidor ShipNow escuchando en el puerto 8080
2026-11-06 11:36:53 [warning] 404 ORDER_NOT_FOUND GET /api/orders/507f1f77bcf86cd799439011
2026-11-06 11:36:54 [info] Seed de mocks generado {"users":3,"drivers":3,"orders":3,"deliveries":3}
2026-11-06 11:36:54 [http] POST /api/mocks/seed?qty=3 201 - 105.5 ms
```

### Qué se registra

- **Arranque:** el servidor escuchando y la conexión a MongoDB, con la URI enmascarada, van como `info`. Si la configuración es inválida o MongoDB no responde al arrancar, se registra un `fatal` y se hace `process.exit(1)`, esperando antes a que la línea quede escrita en el archivo. Las excepciones no controladas y las promesas rechazadas sin manejar también son `fatal`.
- **Conexión a MongoDB ya en marcha:** desconexión (`warning`), reconexión (`info`) y errores (`error`).
- **Requests:** el middleware `http-logger` registra cada request cuando termina (evento `finish`). Nunca loguea el body.
- **Errores de requests:** solo los registra el middleware de errores, así no se duplican. Si el status es menor a 500 van como `warning`, con el código, el método y la ruta. Eso incluye las rutas inexistentes. Si es 500 o más van como `error`, con el stack del error original. La respuesta al cliente no cambia.
- **Negocio:** se registra en los services, que no dependen de Express. Son el seed generado con las cantidades por colección (`info`), el rollback del seed (`error`), el pedido creado con su id (`info`) y el cambio de estado de un pedido (`info`).

### Datos sensibles

Antes de escribir, el formato `redact-sensitive` reemplaza por `[REDACTED]` cualquier campo que se llame `password`, `passwd`, `token`, `authorization` o `secret`, aunque esté anidado. También enmascara las credenciales de cualquier URI de MongoDB (`mongodb://usuario:****@host`). Además, ningún service loguea usuarios ni bodies: solo ids y cantidades.

### Archivos y rotación

- **Carpeta:** `logs/`, en la raíz del proyecto.
- **Archivo:** `logs/error-YYYY-MM-DD.log`, uno por día. Guarda **solo `error` y `fatal`**, nunca `info` ni `debug`.
- **Rotación:** se crea un archivo nuevo cada día o al llegar a 20 MB. Se conservan los últimos **14 días** y los más viejos se borran solos.
- **Git:** `.gitignore` ignora `logs/*` y `*.log`, y conserva la carpeta con `logs/.gitkeep`.

### Endpoint de prueba

`GET /api/loggerTest` genera un log de cada nivel y responde:

```json
{ "status": "success", "payload": { "message": "Logs generados correctamente" } }
```

Igual que `/api/mocks`, solo existe si `NODE_ENV` no es `production`. Va de router a controller, sin service ni repository, porque no tiene lógica de negocio ni datos.

### Cómo probarlo

```bash
npm run dev
curl http://localhost:8080/api/loggerTest
```

En la consola aparecen los 6 niveles, y en `logs/error-<fecha>.log` solo las líneas de `error` y `fatal`. Los errores 4xx quedan como `warning` en la consola y no llegan al archivo:

```bash
curl http://localhost:8080/api/orders/507f1f77bcf86cd799439011   # warning ORDER_NOT_FOUND
curl "http://localhost:8080/api/mocks/users?qty=abc"            # warning INVALID_MOCK_AMOUNT
curl http://localhost:8080/api/ruta-que-no-existe               # warning ROUTE_NOT_FOUND
```

Con `NODE_ENV=production` dejan de aparecer `debug` y `http`, y `/api/mocks` y `/api/loggerTest` responden `404 ROUTE_NOT_FOUND`.
