import { Schema, model } from 'mongoose';
import { DELIVERY_PRIORITY, DELIVERY_STATUS } from '../constants/index.js';

const deliverySchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.PENDING },
    priority: { type: String, enum: Object.values(DELIVERY_PRIORITY), default: DELIVERY_PRIORITY.NORMAL },
  },
  { timestamps: true }
);

export const DeliveryModel = model('Delivery', deliverySchema);
