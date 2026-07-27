import mongoose from 'mongoose';
const { Schema } = mongoose;

const saleSchema = new Schema(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    productId:  { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity:   { type: Number, required: true, min: [0.001, 'Cantidad debe ser mayor a 0'] },
    unitPrice:  { type: Number, required: true, min: 0 },
    unitCost:   { type: Number, required: true, min: 0 }, // snapshot del costo al momento de la venta
    total:      { type: Number, required: true },
    profit:     { type: Number, required: true },
    note:       { type: String, trim: true, maxlength: 300 },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    soldAt:     { type: Date, default: () => new Date(), index: true },
    hiddenFromHistory: { type: Boolean, default: false, index: true },
    paymentMethod: { type: String, enum: ['cash', 'transfer', 'card'], default: 'cash' },
  },
  { timestamps: true }
);

saleSchema.index({ tenantId: 1, soldAt: -1 });

export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);