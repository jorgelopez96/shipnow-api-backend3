import { Schema, model } from 'mongoose';
import { DELIVERY_PRIORITY, ORDER_STATUS } from '../constants/index.js';
import { fileSchema } from './file.schema.js';

const itemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [itemSchema],
      validate: { validator: (items) => items.length > 0, message: 'El pedido necesita al menos un item' },
    },
    deliveryAddress: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.CREATED, index: true },
    priority: { type: String, enum: Object.values(DELIVERY_PRIORITY), default: DELIVERY_PRIORITY.NORMAL },
    proof: { type: fileSchema },
  },
  { timestamps: true }
);

export const OrderModel = model('Order', orderSchema);
