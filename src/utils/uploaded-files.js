import { mkdir, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { DOCUMENT_FOLDERS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger/index.js';

const startsWith = (header, text, offset = 0) => header.subarray(offset, offset + text.length).toString('latin1') === text;

// Tipos aceptados. La extensión del archivo guardado sale del tipo, nunca del nombre que manda el cliente,
// y el contenido se compara con la firma del formato: el MIME type lo declara el cliente y se puede falsear.
export const FILE_TYPES = {
  'application/pdf': { extension: '.pdf', matches: (header) => startsWith(header, '%PDF-') },
  'image/jpeg': { extension: '.jpg', matches: (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff },
  'image/png': { extension: '.png', matches: (header) => startsWith(header, '\x89PNG\r\n\x1a\n') },
  'image/webp': { extension: '.webp', matches: (header) => startsWith(header, 'RIFF') && startsWith(header, 'WEBP', 8) },
};

export const ALLOWED_MIME_TYPES = Object.keys(FILE_TYPES);

export const TMP_UPLOADS_DIR = path.posix.join(config.uploadsDir, 'tmp');

const readHeader = async (filePath) => {
  const handle = await open(filePath);
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

export const removeFile = (filePath) =>
  rm(filePath, { force: true }).catch((error) => logger.warning(`No se pudo borrar el archivo ${filePath}`, { error: error.message }));

// Corre la operación que usa el archivo subido. Si algo falla (entidad inexistente, tipo inválido, error de la base),
// borra el archivo, esté todavía en tmp/ o ya en su carpeta final, para no dejar archivos sin entidad asociada.
export const withUploadedFile = async (file, operation) => {
  if (!file) throw new AppError('FILE_REQUIRED');
  try {
    return await operation();
  } catch (error) {
    await removeFile(file.path);
    throw error;
  }
};

// Valida el contenido, mueve el archivo de tmp/ a la carpeta de su tipo de documento y devuelve los metadatos para la base.
export const storeFile = async (file, documentType) => {
  if (!FILE_TYPES[file.mimetype].matches(await readHeader(file.path))) {
    throw new AppError('INVALID_FILE_TYPE', { message: 'El contenido del archivo no coincide con su tipo', details: `Tipo declarado: ${file.mimetype}` });
  }

  const folder = path.posix.join(config.uploadsDir, DOCUMENT_FOLDERS[documentType]);
  const finalPath = path.posix.join(folder, file.filename);
  try {
    await mkdir(folder, { recursive: true });
    await rename(file.path, finalPath);
  } catch (error) {
    throw new AppError('UPLOAD_ERROR', { details: error.message, cause: error });
  }
  file.path = finalPath;

  return {
    originalName: file.originalname,
    fileName: file.filename,
    path: finalPath,
    mimeType: file.mimetype,
    size: file.size,
    type: documentType,
    uploadedAt: new Date(),
  };
};
