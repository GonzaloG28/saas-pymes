/**
 * modules/stock/models/StockMovement.js
 *
 * Ledger inmutable de movimientos de inventario.
 * El stock NUNCA se sobrescribe — se calcula sumando todos los movimientos.
 */

import mongoose from 'mongoose';
import { decryptNumber } from '../../../shared/encryption/fieldEncryption.js';

const { Schema } = mongoose;

export const MOVEMENT_TYPES = Object.freeze({
  IN:         'IN',
  OUT:        'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER:   'TRANSFER',
  LOSS:       'LOSS',
  RETURN:     'RETURN',
});

const stockMovementSchema = new Schema(
  {
    tenantId: {
      type:     Schema.Types.ObjectId,
      ref:      'Tenant',
      required: [true, 'tenantId es obligatorio'],
    },
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      'Product',
      required: [true, 'productId es obligatorio'],
    },
    quantityChange: {
      type:     Number,
      required: [true, 'quantityChange es obligatorio'],
      validate: {
        validator: (v) => v !== 0 && Number.isFinite(v),
        message:   'quantityChange debe ser un número finito distinto de cero',
      },
    },
    type: {
      type:     String,
      enum:     { values: Object.values(MOVEMENT_TYPES), message: 'type inválido' },
      required: [true, 'type es obligatorio'],
    },
    referenceId:    { type: Schema.Types.ObjectId },
    referenceModel: {
      type:    String,
      enum:    ['Invoice', 'PurchaseOrder', 'ManualAdjustment', null],
      default: null,
    },
    note: {
      type:      String,
      trim:      true,
      maxlength: [300, 'La nota no puede superar 300 caracteres'],
    },
    encryptedUnitCostSnapshot: { type: String, select: false },
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'createdBy es obligatorio'],
    },
    effectiveDate: {
      type:    Date,
      default: () => new Date(),
      index:   true,
    },
    hiddenFromHistory: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// ── Índices ───────────────────────────────────────────────────────────────────
stockMovementSchema.index({ tenantId: 1, productId: 1, effectiveDate: -1 }, { name: 'idx_tenant_product_date' });
stockMovementSchema.index({ tenantId: 1, type: 1, effectiveDate: -1 },      { name: 'idx_tenant_type_date' });
stockMovementSchema.index({ tenantId: 1, createdBy: 1 },                    { name: 'idx_tenant_creator' });

stockMovementSchema.virtual('unitCostSnapshot').get(function () {
  return this.encryptedUnitCostSnapshot ? decryptNumber(this.encryptedUnitCostSnapshot) : null;
});

stockMovementSchema.set('toJSON',   { virtuals: true });
stockMovementSchema.set('toObject', { virtuals: true });

// ── Inmutabilidad ─────────────────────────────────────────────────────────────
stockMovementSchema.pre('save', function (next) {
  if (!this.isNew) {
    const err = new Error('Los movimientos son inmutables. Crea un ADJUSTMENT para corregir.');
    err.name   = 'ImmutableDocumentError';
    err.status = 403;
    return next(err);
  }
  if (this.type === MOVEMENT_TYPES.ADJUSTMENT && !this.note?.trim()) {
    const err = new Error('ADJUSTMENT requiere una nota explicativa.');
    err.name   = 'ValidationError';
    err.status = 422;
    return next(err);
  }
});

stockMovementSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const err  = new Error('Actualización no permitida en colección inmutable.');
  err.name   = 'ImmutableDocumentError';
  err.status = 403;
  
});

// ── Métodos estáticos ─────────────────────────────────────────────────────────
stockMovementSchema.statics.getCurrentStock = async function (tenantId, productId) {
  const result = await this.aggregate([
    { $match: { tenantId, productId } },
    { $group: { _id: null, total: { $sum: '$quantityChange' } } },
  ]);
  return result[0]?.total ?? 0;
};

stockMovementSchema.statics.getStockSnapshot = async function (tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    { $group: { _id: '$productId', stock: { $sum: '$quantityChange' } } },
    { $project: { _id: 0, productId: '$_id', stock: 1 } },
  ]);
};

// ── Serializer seguro ─────────────────────────────────────────────────────────
stockMovementSchema.methods.toSafeObject = function () {
  return {
    id:             this._id,
    tenantId:       this.tenantId,
    productId:      this.productId,
    quantityChange: this.quantityChange,
    type:           this.type,
    referenceId:    this.referenceId,
    referenceModel: this.referenceModel,
    note:           this.note,
    unitCostSnapshot: this.unitCostSnapshot,
    createdBy:      this.createdBy,
    effectiveDate:  this.effectiveDate,
    createdAt:      this.createdAt,
  };
};

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

