import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import multer from 'multer';
import { MAX_UPLOAD_SIZE_MB } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/index.js';
import { ALLOWED_MIME_TYPES, FILE_TYPES, TMP_UPLOADS_DIR } from '../utils/uploaded-files.js';

// Multer deja el archivo en uploads/tmp. El service lo mueve a la carpeta de su tipo de documento recién
// cuando valida todo, así no depende del orden en que llegan los campos del formulario.
const storage = multer.diskStorage({
  destination: (req, file, cb) => mkdir(TMP_UPLOADS_DIR, { recursive: true }).then(() => cb(null, TMP_UPLOADS_DIR), cb),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${FILE_TYPES[file.mimetype].extension}`),
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
  logger.warning(`Intento de subir un tipo de archivo no permitido en ${req.method} ${req.originalUrl}`, { mimeType: file.mimetype });
  cb(new AppError('INVALID_FILE_TYPE', { details: `Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}` }));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1, fields: 5 },
});

const toUploadError = (error, field) => {
  if (error instanceof AppError) return error;
  if (error.code === 'LIMIT_FILE_SIZE') return new AppError('FILE_TOO_LARGE', { details: `Máximo: ${MAX_UPLOAD_SIZE_MB} MB` });
  if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('UNEXPECTED_FILE_FIELD', { details: `Se espera un solo archivo en el campo "${field}"` });
  }
  if (error.syscall) return new AppError('UPLOAD_ERROR', { details: error.message, cause: error });
  return new AppError('VALIDATION_ERROR', { message: 'El formulario multipart/form-data no es válido', details: error.message });
};

// Recibe un solo archivo en el campo indicado y traduce los errores de Multer al diccionario de errores.
// Si el archivo no llega, req.file queda vacío y el service responde FILE_REQUIRED.
export const uploadSingle = (field) => {
  const middleware = upload.single(field);
  return (req, res, next) => middleware(req, res, (error) => next(error && toUploadError(error, field)));
};
