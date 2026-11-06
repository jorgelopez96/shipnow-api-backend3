const defineError = (statusCode, message) => ({ statusCode, message });

export const ERRORS = Object.freeze({
  VALIDATION_ERROR: defineError(400, 'Los datos enviados no son válidos'),
  INVALID_ID: defineError(400, 'El ID enviado no tiene un formato válido'),
  INVALID_JSON: defineError(400, 'El body no es un JSON válido'),
  ROUTE_NOT_FOUND: defineError(404, 'La ruta solicitada no existe'),
  DUPLICATE_VALUE: defineError(409, 'Ya existe un registro con ese valor'),

  USER_NOT_FOUND: defineError(404, 'El usuario solicitado no existe'),
  USER_ALREADY_EXISTS: defineError(409, 'Ya existe un usuario con ese email'),
  PASSWORD_REQUIRED: defineError(400, 'La contraseña es obligatoria'),

  PRODUCT_NOT_FOUND: defineError(404, 'No se encontró el producto solicitado'),
  PRODUCT_OUT_OF_STOCK: defineError(404, 'El producto solicitado no tiene stock'),

  ORDER_NOT_FOUND: defineError(404, 'No se encontró el pedido solicitado'),
  ORDER_ITEMS_REQUIRED: defineError(400, 'El pedido debe incluir al menos un item'),
  INVALID_ORDER_STATUS: defineError(400, 'El estado indicado no es válido para un pedido'),
  ORDER_ALREADY_CLOSED: defineError(409, 'El pedido ya fue entregado o cancelado y no puede cambiar de estado'),

  DELIVERY_NOT_FOUND: defineError(404, 'No se encontró la entrega solicitada'),
  DRIVER_NOT_FOUND: defineError(404, 'El repartidor no existe o no tiene rol de repartidor'),
  DRIVER_NOT_AVAILABLE: defineError(409, 'El repartidor no está disponible para tomar una nueva entrega'),

  INVALID_MOCK_AMOUNT: defineError(400, 'La cantidad de registros a generar debe ser un número entero positivo'),
  MOCK_LIMIT_EXCEEDED: defineError(400, 'Se pidió generar más registros de los permitidos'),
  MOCK_DEPENDENCIES_MISSING: defineError(400, 'Faltan datos relacionados para generar los registros pedidos'),
  MOCK_GENERATION_ERROR: defineError(500, 'No se pudieron cargar los datos de prueba en la base'),

  DATABASE_ERROR: defineError(500, 'Error al comunicarse con la base de datos'),
  INTERNAL_SERVER_ERROR: defineError(500, 'Error interno del servidor'),
});
