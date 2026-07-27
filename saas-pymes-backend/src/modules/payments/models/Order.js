import mongoose from 'mongoose';
const { Schema } = mongoose;

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID:    'paid',
  FAILED:  'failed',
  CANCELLED: 'cancelled',
});

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity:  { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 }, // snapshot del precio al crear la orden
  },
  { _id: false }
);

const receiptSchema = new Schema(
  {
    paymentMethod:  { type: String },      // ej. "credit_card", "debit_card"
    lastFourDigits: { type: String },
    operationNumber: { type: String },
    paidAt:         { type: Date },
    mpPaymentId:    { type: String },      // ID del pago en Mercado Pago, para trazabilidad/reembolsos
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    items:    { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    receipt: { type: receiptSchema, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 }, { name: 'idx_tenant_status_date' });

orderSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    items: this.items,
    totalAmount: this.totalAmount,
    status: this.status,
    receipt: this.receipt,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Order', orderSchema);