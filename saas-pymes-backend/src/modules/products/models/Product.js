// modules/products/models/Product.js

import mongoose                      from 'mongoose';
import { encrypt, decryptNumber }    from '../../../shared/encryption/fieldEncryption.js';

const { Schema } = mongoose;

const UNIT_ENUM = ['unit', 'kg', 'liter', 'box', 'pack'];

const auditSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    tenantId: {
      type:     Schema.Types.ObjectId,
      ref:      'Tenant',
      required: [true, 'tenantId es obligatorio'],
      index:    true,
    },
    sku: {
      type:      String,
      required:  [true, 'El SKU es obligatorio'],
      uppercase: true,
      trim:      true,
      maxlength: [50, 'SKU no puede superar 50 caracteres'],
      match:     [/^[A-Z0-9\-_]+$/, 'SKU solo permite letras, números, guión y guión bajo'],
    },
    name: {
      type:      String,
      required:  [true, 'El nombre es obligatorio'],
      trim:      true,
      minlength: [2,   'El nombre debe tener al menos 2 caracteres'],
      maxlength: [120, 'El nombre no puede superar 120 caracteres'],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [500, 'La descripción no puede superar 500 caracteres'],
      default:   '',
    },
    unit: {
      type:    String,
      enum:    { values: UNIT_ENUM, message: `Unidad debe ser: ${UNIT_ENUM.join(', ')}` },
      default: 'unit',
    },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },

    // Campos financieros cifrados — select:false = nunca en queries por defecto
    encryptedCost: {
      type:     String,
      required: [true, 'El costo es obligatorio'],
      select:   false,
    },
    encryptedPrice: {
      type:     String,
      required: [true, 'El precio es obligatorio'],
      select:   false,
    },

    isActive: { type: Boolean, default: true, index: true },
    audit:    auditSchema,
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true, getters: false },
    toObject:   { virtuals: true },
  }
);

// ── Índices ───────────────────────────────────────────────────────────────────
productSchema.index({ tenantId: 1, sku: 1 },            { unique: true, name: 'idx_tenant_sku' });
productSchema.index({ tenantId: 1, isActive: 1, name: 1 },              { name: 'idx_tenant_active_name' });
productSchema.index({ tenantId: 1, categoryId: 1 },                     { name: 'idx_tenant_category' });

// ── Virtuales de descifrado ───────────────────────────────────────────────────
productSchema.virtual('cost').get(function () {
  return this.encryptedCost ? decryptNumber(this.encryptedCost) : null;
});
productSchema.virtual('price').get(function () {
  return this.encryptedPrice ? decryptNumber(this.encryptedPrice) : null;
});
productSchema.virtual('grossMarginPct').get(function () {
  const { cost, price } = this;
  if (!cost || !price || price === 0) return null;
  return Number((((price - cost) / price) * 100).toFixed(2));
});

// ── Hook pre-save ─────────────────────────────────────────────────────────────
productSchema.pre('save', function (next) {
  if (this.isModified('encryptedCost')  && typeof this.encryptedCost  === 'number')
    this.encryptedCost  = encrypt(this.encryptedCost);
  if (this.isModified('encryptedPrice') && typeof this.encryptedPrice === 'number')
    this.encryptedPrice = encrypt(this.encryptedPrice);
});

// ── Método estático de construcción ──────────────────────────────────────────
productSchema.statics.build = function ({ cost, price, ...rest }) {
  return new this({
    ...rest,
    encryptedCost:  encrypt(cost),
    encryptedPrice: encrypt(price),
  });
};

// ── Serializer seguro ─────────────────────────────────────────────────────────
productSchema.methods.toSafeObject = function () {
  return {
    id:            this._id,
    tenantId:      this.tenantId,
    sku:           this.sku,
    name:          this.name,
    description:   this.description,
    unit:          this.unit,
    categoryId:    this.categoryId,
    cost:          this.cost,
    price:         this.price,
    grossMarginPct: this.grossMarginPct,
    isActive:      this.isActive,
    createdAt:     this.createdAt,
    updatedAt:     this.updatedAt,
  };
};

export default mongoose.model('Product', productSchema);

