# ShipNow API

API de una plataforma de logística hecha con **Node.js**, **Express 5** (ES Modules) y **MongoDB + Mongoose**.

Incluye:

- **Arquitectura por capas** y configuración de entorno validada.
- **Mocking** con `@faker-js/faker` y carga de datos de prueba en MongoDB.
- **Manejo profesional de errores** con un diccionario de errores y un middleware global.
- **Logging y monitoreo básico** con Winston (ver [Logging](#logging)).
- **Documentación interactiva** con Swagger en `/api/docs` (ver [Documentación con Swagger](#documentación-con-swagger)).
- **Tests funcionales** con Mocha, Chai y Supertest (ver [Testing](#testing)).
- **Carga de archivos** con Multer: documentos de usuario y comprobantes de entrega (ver [Carga de archivos](#carga-de-archivos)).

## Instalación

Requisitos: Node.js 20.19 o superior (o 22.12+) y una base MongoDB (local o en Atlas).

```bash
git clone <url-del-repo>
cd <carpeta-del-repo>
npm install
cp .env.example .env             # después completá los valores
cp .env.test.example .env.test   # solo para correr los tests
```

## Variables de entorno

| Variable      | Obligatoria | Default | Descripción                                                    |
| ------------- | ----------- | ------- | -------------------------------------------------------------- |
| `MONGODB_URI` | Sí          | -       | Cadena de conexión a MongoDB                                   |
| `NODE_ENV`    | Sí          | -       | `development`, `production` o `test`. En `production` no hay mocks |
| `PORT`        | No          | `8080`  | Puerto del servidor (entero entre 1 y 65535)                   |
| `LOG_LEVEL`   | No          | Según `NODE_ENV` | Nivel mínimo de los logs de consola (ver [Logging](#logging)) |

Solo la carpeta `src/config/` lee `process.env`. `env.loader.js` lee y valida las variables sin tirar errores, y `index.js` exporta el objeto `config` congelado, o tira un error si algo está mal. Si falta una obligatoria o tiene un valor inválido, la app no arranca y el motivo queda registrado como `fatal`:

```
2026-11-06 11:38:16 [fatal] No se pudo arrancar ShipNow. Configuración inválida: NODE_ENV debe ser development, production o test (llegó "staging"). Revisá tu .env (podés partir de .env.example).
```

## Cómo correr

```bash
npm run dev   # desarrollo, con nodemon
npm start     # node server.js
npm test      # tests funcionales (ver Testing)
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
| **Users**      | `GET`/`POST /api/users`, `GET`/`PUT`/`DELETE /api/users/{id}`, `POST /api/users/{id}/documents` |
| **Products**   | `GET`/`POST /api/products`, `GET`/`PUT`/`DELETE /api/products/{id}`                             |
| **Orders**     | `GET`/`POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/status`, `POST /api/orders/{id}/proof` |
| **Deliveries** | `GET`/`POST /api/deliveries`, `GET /api/deliveries/{id}`                                        |
| **Mocks**      | `GET /api/mocks/mockingusers`, `/mockingorders`, `/drivers`, `/deliveries` (y sus alias), `POST /api/mocks/generateData` (y `/seed`) |
| **Logger**     | `GET /api/loggerTest`, aclarado como herramienta de validación y no de negocio                  |

Cada endpoint tiene método, ruta, un `summary` corto y una `description` que explica para qué sirve y qué devuelve (por ejemplo, qué viene populado o qué pasa si el producto no tiene stock), parámetros de ruta y de query, body esperado con ejemplo, respuesta exitosa y cada error que puede devolver, con el código del [diccionario de errores](#diccionario-de-errores).

**Schemas reutilizables:** `User`, `Product`, `Order`, `OrderItem`, `Delivery`, `StoredFile` (metadatos de un archivo subido), `SuccessResponse` y `ErrorResponse`, más los resúmenes que aparecen cuando una respuesta viene con `populate` (`CustomerSummary`, `OrderSummary`, `DriverSummary`) y `SeedCounts` para la carga de mocks.

**Respuestas exitosas reutilizables:** `UserResponse`, `UserListResponse`, `ProductResponse`, `ProductListResponse`, `OrderResponse`, `OrderListResponse`, `DeliveryResponse` y `DeliveryListResponse` combinan `SuccessResponse` con el recurso. Cada endpoint las referencia con `$ref` en lugar de repetir la estructura.

**Respuestas de error reutilizables:** todos los errores se definen una sola vez en `components/responses` y los endpoints los referencian con `$ref`, sin ejemplos inline. Las comunes están en `schemas.yaml` (`InvalidId`, `InvalidData`, `InvalidIdOrData`, `InternalError`, `FileTooLarge`, `InvalidFileType`, `UploadError`) y las de cada módulo en su YAML (`UserNotFound`, `UserAlreadyExists`, `InvalidUserData`, `ProductUnavailable`, `OrderAlreadyClosed`, `DriverNotAvailable`, etc.). Cuando un status puede tener varias causas, la respuesta trae un ejemplo por cada una para elegirlo en Swagger UI. Por ejemplo, `InvalidUserData` se usa en `POST` y `PUT /api/users` y muestra contraseña faltante, campo obligatorio, rol inexistente, ID inválido y JSON roto.

Los tests (`tests/docs.test.js`) verifican que no haya `$ref` rotos, que cada endpoint tenga `summary` y `description`, que todos los errores usen `$ref`, que `GET /api/docs/` responda 200 y que la URL del server coincida con el puerto configurado.

Los dos endpoints de carga están documentados como `multipart/form-data`: nombre del campo del archivo (`document` o `proof`), campo `type` con los tipos de documento permitidos, tipos de archivo y tamaño máximo, respuesta exitosa y cada error posible. Desde **Try it out** se puede elegir el archivo y subirlo.

### Aclaraciones para probar

- **Mocks y Logger solo existen fuera de producción.** Con `NODE_ENV=production` esas rutas devuelven `404` y tampoco aparecen en Swagger, para que la documentación muestre siempre lo que la API de verdad responde.
- **No hay autenticación**, así que no hay errores `401`/`403` documentados.
- `details` en los errores solo aparece fuera de producción.
- Para tener datos con los que probar, conviene empezar por `POST /api/mocks/generateData` con `{ "users": 5, "drivers": 2, "orders": 10, "deliveries": 3 }` y después usar los IDs que devuelven `GET /api/users` y `GET /api/orders`.
- Los IDs se validan: uno con formato inválido (por ejemplo `123`) devuelve `400 INVALID_ID`, y uno con formato válido que no existe devuelve el `404` del recurso.
- En `POST /api/orders` y `POST /api/deliveries` la respuesta trae los IDs relacionados tal cual. En los `GET` vienen populados (cliente, pedido y repartidor).

## Testing

Tests funcionales que le pegan a los endpoints reales (ruta → controller → service → repository → MongoDB) y validan el status, la forma del body y los datos importantes de cada respuesta.

### Herramientas

| Herramienta  | Para qué                                                        |
| ------------ | --------------------------------------------------------------- |
| **Mocha**    | Organiza y ejecuta los tests (`describe`, `it` y hooks)         |
| **Chai**     | Valida los resultados con `expect`                              |
| **Supertest** | Hace las peticiones HTTP a la app de Express sin abrir un puerto |

`src/app.js` exporta la app y `server.js` es el único que la levanta con `listen`, así que los tests importan la app directamente.

### Cómo ejecutarlos

Con MongoDB corriendo:

```bash
cp .env.test.example .env.test   # solo la primera vez
npm test
```

`npm test` corre `mocha`, que toma la configuración de `.mocharc.json`: carga `.env.test`, ejecuta `tests/setup.js` y después todos los `tests/**/*.test.js`.

### Base de datos y variables de entorno

Los tests usan **su propia base de datos** (`shipnow_test`) y su propio archivo de variables, **`.env.test`**, separado del `.env` de desarrollo:

| Variable      | Valor de ejemplo                             |
| ------------- | -------------------------------------------- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/shipnow_test`     |
| `NODE_ENV`    | `test`                                       |

Con `NODE_ENV=test`, `src/config` lee `.env.test` en lugar de `.env` y el logger queda en silencio.

**Protección:** como los tests vacían la base, `tests/setup.js` no arranca si el nombre de la base no incluye `test`. Así no hay forma de borrar por error la base de desarrollo.

### Datos de prueba y limpieza

- **Cada test crea sus propios datos** dentro del test o en un `beforeEach` (por ejemplo, un cliente antes de crear un pedido) con helpers de `tests/helpers.js`. No hay datos cargados a mano y ningún test depende de otro ni del orden en que corren.
- **`beforeEach` global:** antes de cada test se vacían todas las colecciones, así cada test arranca con la base vacía.
- **`after` global:** al terminar la suite se borra la base de test completa y se cierra la conexión.
- **Archivos:** los tests suben archivos a `uploads-test/` (no a `uploads/`). La carpeta se vacía antes de cada test y se borra al terminar. Los archivos de prueba se arman en memoria (`PDF_FILE` y `PNG_FILE` en `tests/helpers.js`) y se mandan con `.attach()`.

La suite se puede correr las veces que haga falta, sin borrar nada a mano.

### Qué está cubierto

| Archivo                     | Qué prueba                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `tests/users.test.js`       | Listar, crear, consultar, actualizar y borrar usuarios. Contraseña hasheada y nunca devuelta, email duplicado, rol inválido. **Carga de documentos:** carga correcta y metadatos, licencia de repartidor, falta el archivo, campo equivocado, tipo de documento inválido, tipo de archivo no permitido o disfrazado, más de 5 MB, usuario inexistente, y que no queden archivos sueltos cuando falla |
| `tests/products.test.js`    | CRUD de productos, estado según el stock, `code` duplicado, producto sin stock                                     |
| `tests/orders.test.js`      | Listar, crear y consultar pedidos por ID, total calculado, cliente populado, **cambio de estado**, estado inválido y pedido cerrado. **Comprobantes:** carga correcta, reemplazo del anterior, falta el archivo, campo equivocado, tipo no permitido, pedido inexistente |
| `tests/deliveries.test.js`  | Listar, crear y consultar entregas, repartidor inexistente, sin rol `driver` o no disponible                       |
| `tests/mocks.test.js`       | Los 6 `GET` de mocks y los 2 `POST` de carga: cantidades por defecto y por `qty`, datos guardados y relacionados, cantidades inválidas, límite y dependencias faltantes |
| `tests/logger.test.js`      | `/api/loggerTest` responde bien y escribe un mensaje de cada nivel                                                 |
| `tests/docs.test.js`        | `/api/docs` sirve Swagger UI, la especificación tiene info, tags y schemas, y no hay `$ref` rotas                  |
| `tests/errors.test.js`      | Ruta inexistente (`ROUTE_NOT_FOUND`) y `details` fuera de producción                                               |

**Errores:** cada caso valida el status HTTP y el formato del middleware de errores (`status`, `statusCode`, `error` y `message`). El mensaje esperado sale del diccionario de errores, o es el texto exacto cuando el service lo personaliza.

**Coherencia con Swagger:** cada error documentado en Swagger tiene su test. Además, `docs.test.js` recorre todas las rutas de la especificación y comprueba que existan en la API y que respondan con un status que esté documentado. Los únicos que no se testean son los `500` (`INTERNAL_SERVER_ERROR`, `DATABASE_ERROR`, `MOCK_GENERATION_ERROR`), porque para provocarlos habría que romper la base a propósito.

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
├── models/            Schemas de Product, User, Order y Delivery, más el de metadatos de archivos
├── mocks/             Generadores de datos falsos con @faker-js/faker (locale es)
├── docs/              Configuración de Swagger y documentación OpenAPI en YAML
├── errors/            Diccionario de errores y clase AppError
├── middlewares/       Middleware global de errores, de rutas inexistentes, de logs HTTP y de carga de archivos (Multer)
└── utils/             Hash de contraseñas, total del pedido, respuesta de éxito, selección de campos, enmascarado de la URI y archivos subidos
tests/                 Tests funcionales con Mocha, Chai y Supertest (ver Testing)
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
| DELETE | `/api/users/:id`  | Elimina un usuario (y sus archivos) y lo devuelve                    |
| POST   | `/api/users/:id/documents` | Sube un documento del usuario (ver [Carga de archivos](#carga-de-archivos)) |

Campos: `firstName`, `lastName`, `email` (único), `password`, `role` (`customer` por defecto, `driver`, `store` o `admin`) e `isAvailable` (para los repartidores). No se puede usar un email que ya tenga otro usuario.

**La contraseña nunca sale de la API.** El schema de `User` tiene un `transform` en `toJSON` y `toObject` que la borra, así que se oculta en cualquier salida del modelo (`find`, `create`, `insertMany`) sin que cada capa tenga que acordarse. Se eligió esto y no `select: false` porque `create()` e `insertMany()` devuelven el documento con la contraseña igual, y habría que limpiarla a mano en cada lugar. Por eso el repository de usuarios no usa `.lean()`, que saltearía el transform.

### Pedidos y entregas

| Método | Ruta                       | Descripción                                                                                   |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/api/orders`              | Lista los pedidos con los datos del cliente                                                   |
| GET    | `/api/orders/:id`          | Obtiene un pedido                                                                             |
| POST   | `/api/orders`              | Crea un pedido. El total se calcula desde los items y el cliente tiene que existir           |
| PATCH  | `/api/orders/:id/status`   | Cambia el estado (`{ "status": "in_transit" }`). Un pedido entregado o cancelado ya no cambia |
| POST   | `/api/orders/:id/proof`    | Sube el comprobante de entrega del pedido (ver [Carga de archivos](#carga-de-archivos))       |
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
| `FILE_REQUIRED`             | 400  | No llegó el archivo (o el body no es `multipart/form-data`)          |
| `UNEXPECTED_FILE_FIELD`     | 400  | El archivo llegó en otro campo o se mandó más de uno                 |
| `INVALID_DOCUMENT_TYPE`     | 400  | El tipo de documento no existe o no corresponde (licencia de alguien que no es repartidor) |
| `FILE_TOO_LARGE`            | 413  | El archivo pesa más de 5 MB                                          |
| `INVALID_FILE_TYPE`         | 415  | No es PDF, JPEG, PNG ni WEBP, o el contenido no coincide con el tipo |
| `UPLOAD_ERROR`              | 500  | No se pudo guardar el archivo en el servidor                         |
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

## Carga de archivos

La API recibe archivos por `multipart/form-data` con **[Multer](https://github.com/expressjs/multer)**, los guarda en carpetas del servidor y registra sus **metadatos** en la entidad a la que pertenecen. En MongoDB nunca se guarda el archivo.

### Endpoints

| Método | Ruta                        | Campo del archivo | Otros campos | Dónde se registra |
| ------ | --------------------------- | ----------------- | ------------ | ----------------- |
| POST   | `/api/users/:id/documents` | `document`        | `type` (opcional): `user_document` (default) o `driver_license` | Se suma a `documents` del usuario |
| POST   | `/api/orders/:id/proof`    | `proof`           | -            | Queda en `proof` del pedido, con tipo `delivery_proof`. Si ya tenía uno, lo reemplaza y borra el archivo viejo |

Los dos responden `200` con la entidad actualizada (`{ status: "success", payload }`). `driver_license` solo se acepta para usuarios con rol `driver`.

```bash
curl -X POST http://localhost:8080/api/users/<id>/documents -F type=user_document -F document=@dni.pdf
curl -X POST http://localhost:8080/api/orders/<id>/proof -F proof=@entrega.jpg
```

### Configuración

Toda la configuración de Multer está en `src/middlewares/upload.middleware.js`. Los routers solo usan `uploadSingle('document')` o `uploadSingle('proof')`.

- **Tipos aceptados:** PDF, JPEG, PNG y WEBP.
- **Tamaño máximo:** 5 MB (`MAX_UPLOAD_SIZE_MB` en `src/constants`). Un solo archivo por petición.
- **Nombre:** `<timestamp>-<uuid>.<extensión>`. La extensión sale del tipo de archivo, nunca del nombre que manda el cliente, así no se puede guardar un `.exe` ni pisar otro archivo.
- **Contenido:** el MIME type lo declara el cliente, así que además se leen los primeros bytes del archivo y se comparan con la firma del formato (`%PDF-`, PNG, JPEG, WEBP). Un archivo renombrado a `.pdf` se rechaza.
- **Errores:** `uploadSingle` traduce los errores de Multer al diccionario (`FILE_TOO_LARGE`, `UNEXPECTED_FILE_FIELD`, `INVALID_FILE_TYPE`, `UPLOAD_ERROR`), así responden con el mismo formato que el resto de la API.

### Carpetas

```
uploads/
├── tmp/         Donde Multer deja el archivo mientras se valida
├── documents/   user_document
├── licenses/    driver_license
└── proofs/      delivery_proof (comprobantes de entrega)
```

Las carpetas se crean solas la primera vez que hacen falta. `uploads/` está en `.gitignore`: los archivos subidos no van al repositorio.

### Flujo

```
Router → uploadSingle (Multer guarda en tmp/) → Controller → Service → Repository → MongoDB
```

1. Multer valida el tipo y el tamaño, y deja el archivo en `uploads/tmp`.
2. El service valida que haya archivo, el tipo de documento y que la entidad exista.
3. Revisa el contenido, mueve el archivo a su carpeta y guarda los metadatos en la entidad.
4. **Si algo falla en cualquier paso, el archivo se borra**, esté en `tmp/` o ya movido, para no dejar archivos sin entidad. Al borrar un usuario también se borran sus archivos.

Se mueve recién al final, y no se guarda directo en la carpeta final, porque Multer elige la carpeta antes de leer los campos que vienen después del archivo: depender del orden de los campos del formulario sería frágil.

### Metadatos guardados

```json
{
  "originalName": "dni.pdf",
  "fileName": "1794626703428-a126c9a9-43d9-4719-a881-a3433db6e6ee.pdf",
  "path": "uploads/documents/1794626703428-a126c9a9-43d9-4719-a881-a3433db6e6ee.pdf",
  "mimeType": "application/pdf",
  "size": 24533,
  "type": "user_document",
  "uploadedAt": "2026-11-14T03:25:03.444Z"
}
```

El schema está en `src/models/file.schema.js` y lo usan `User.documents` (lista) y `Order.proof` (uno solo).

### Cómo probar los errores

```bash
curl -X POST http://localhost:8080/api/users/<id>/documents -F type=user_document                 # 400 FILE_REQUIRED
curl -X POST http://localhost:8080/api/users/<id>/documents -F archivo=@dni.pdf                   # 400 UNEXPECTED_FILE_FIELD
curl -X POST http://localhost:8080/api/users/<id>/documents -F type=pasaporte -F document=@dni.pdf # 400 INVALID_DOCUMENT_TYPE
curl -X POST http://localhost:8080/api/users/<id>/documents -F document=@notas.txt                # 415 INVALID_FILE_TYPE
curl -X POST http://localhost:8080/api/users/<id>/documents -F document=@video-grande.pdf         # 413 FILE_TOO_LARGE
curl -X POST http://localhost:8080/api/orders/507f1f77bcf86cd799439011/proof -F proof=@entrega.jpg # 404 ORDER_NOT_FOUND
```

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
| `test`        | Nada (silencio) | -     |

En `test` el logger no escribe en la consola ni crea el archivo de errores, para que la salida de Mocha quede limpia (ver [Testing](#testing)).

Con `LOG_LEVEL` se puede cambiar el nivel de la consola (por ejemplo, `LOG_LEVEL=warning`). Si tiene un valor que no es un nivel, la app no arranca.

Cada línea tiene el formato `YYYY-MM-DD HH:mm:ss [nivel] [request-id] mensaje`. El request-id solo aparece en los logs que se escriben durante un request. Si hay metadata va después, en JSON, y si es un error el stack trace va en las líneas siguientes.

```
2026-11-16 00:30:12 [info] Servidor ShipNow escuchando en el puerto 8080
2026-11-16 00:30:20 [info] [3f1c9a2e-8d4b-4c61-9f0e-2b7a5d8e1c34] Pedido creado: 6918c1f4a2b3c4d5e6f70812 {"total":3500,"items":2}
2026-11-16 00:30:20 [http] [3f1c9a2e-8d4b-4c61-9f0e-2b7a5d8e1c34] POST /api/orders 201 - 18.4 ms
2026-11-16 00:30:25 [warning] [a07e5b19-2c3d-4e8f-b1a6-9d0c7e4f2a58] 404 ORDER_NOT_FOUND GET /api/orders/507f1f77bcf86cd799439011
```

### Request-id

Cada request recibe un ID (`randomUUID()`) que se agrega solo a todos sus logs, se escriban en el middleware, el controller o el service, y que vuelve al cliente en el header `X-Request-Id`. Así se pueden filtrar todas las líneas de un mismo pedido aunque haya muchos requests a la vez.

- Se guarda con `AsyncLocalStorage` (`src/logger/request-context.js`), así que no hay que pasarlo de capa en capa. Lo agrega un formato de Winston al armar cada línea.
- Si el cliente manda su propio `X-Request-Id` (por ejemplo, otro servicio que ya tiene uno), se respeta, pero solo si son letras, números, `-` o `_` y hasta 64 caracteres. Si no, se genera uno nuevo para que nadie pueda meter texto raro en los logs.

```bash
curl -i http://localhost:8080/api/orders/507f1f77bcf86cd799439011   # el header X-Request-Id coincide con el de la línea del warning
```

### Qué se registra

- **Arranque:** el servidor escuchando y la conexión a MongoDB, con la URI enmascarada, van como `info`. Si la configuración es inválida o MongoDB no responde al arrancar, se registra un `fatal` y se hace `process.exit(1)`, esperando antes a que la línea quede escrita en el archivo. Las excepciones no controladas y las promesas rechazadas sin manejar también son `fatal`.
- **Conexión a MongoDB ya en marcha:** desconexión (`warning`), reconexión (`info`) y errores (`error`).
- **Requests:** el middleware `http-logger` registra cada request cuando termina (evento `finish`). Nunca loguea el body.
- **Errores de requests:** solo los registra el middleware de errores, así no se duplican. Si el status es menor a 500 van como `warning`, con el código, el método y la ruta. Eso incluye las rutas inexistentes. Si es 500 o más van como `error`, con el stack del error original. La respuesta al cliente no cambia.
- **Negocio:** se registra en los services, que no dependen de Express. Son el seed generado con las cantidades por colección (`info`), el rollback del seed (`error`), el pedido creado con su id (`info`), el cambio de estado de un pedido (`info`), el documento cargado a un usuario y el comprobante asociado a un pedido (`info`, con tipo, MIME type y tamaño).
- **Archivos rechazados:** el intento de subir un tipo no permitido se registra como `warning` con el MIME type recibido, además de la línea del error. Si falla el guardado (`UPLOAD_ERROR`), va como `error` con el stack.

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

Con `NODE_ENV=production` dejan de aparecer `debug` y `http`, los logs van sin colores, los errores no traen `details` y `/api/mocks` y `/api/loggerTest` responden `404 ROUTE_NOT_FOUND`. Probado levantando el servidor con `NODE_ENV=production`:

```
2026-11-16 00:17:41 [info] Conectado a MongoDB en mongodb://127.0.0.1:27017/shipnow_pruebas
2026-11-16 00:17:41 [info] Servidor ShipNow escuchando en el puerto 8099
2026-11-16 00:17:41 [info] Entorno production, logs desde el nivel info
2026-11-16 00:17:44 [warning] [8996fe5c-cd35-4ec5-8b08-07c8b7049fdd] 404 ROUTE_NOT_FOUND GET /api/loggerTest
2026-11-16 00:17:44 [warning] [e870d39f-ca64-47a0-8fb5-3bd21d54273b] 400 INVALID_ID GET /api/users/123
```
