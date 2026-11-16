import { Schema } from 'mongoose';
import { DOCUMENT_TYPES } from '../constants/index.js';

// Metadatos de un archivo subido. El archivo vive en uploads/; en la base solo queda cómo encontrarlo.
export const fileSchema = new Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, enum: Object.values(DOCUMENT_TYPES), required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
