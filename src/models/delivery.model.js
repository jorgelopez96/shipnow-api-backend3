import { Schema, model } from 'mongoose';
import { DELIVERY_PRIORITY, DELIVERY_STATUS } from '../constants/index.js';

// Tracking: cada cambio de estado queda registrado con su fecha.
const statusChangeSchema = new Schema(
  {
    status: { type: String, enum: Object.values(DELIVERY_STATUS), required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliverySchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.PENDING, index: true },
    priority: { type: String, enum: Object.values(DELIVERY_PRIORITY), default: DELIVERY_PRIORITY.NORMAL },
    history: { type: [statusChangeSchema], default: [] },
  },
  { timestamps: true }
);

export const DeliveryModel = model('Delivery', deliverySchema);
