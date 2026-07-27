// modules/financials/models/FinancialTransaction.js
//
// Ledger inmutable de caja. Misma filosofía que StockMovement:
//  - Nunca se sobrescribe un saldo. El balance actual = suma de todas las transacciones.
//  - Cada documento es permanente. Para corregir: crear transacción inversa.
//  - Los montos van cifrados (AES-256-GCM) porque son datos financieros sensibles.

import mongoose  from 'mongoose';
import { encrypt, decryptNumber } from '../../../shared/encryption/fieldEncryption.js';

const { Schema } = mongoose;

// ── Enums ─────────────────────────────────────────────────────────────────────
export const TRANSACTION_TYPES = Object.freeze({
  INCOME:     'INCOME',      // Ingreso: venta, cobro, transferencia recibida
  EXPENSE:    'EXPENSE',     // Egreso: compra, pago de proveedor, gasto operativo
  TRANSFER:   'TRANSFER',    // Movimiento interno entre cuentas (futuro)
  ADJUSTMENT: 'ADJUSTMENT',  // Corrección manual (requiere nota)
});

export const PAYMENT_METHODS = Object.freeze({
  CASH:         'CASH',
  BANK_TRANSFER:'BANK_TRANSFER',
  CARD:         'CARD',
  CHECK:        'CHECK',
  OTHER:        'OTHER',
});

// ── Schema ────────────────────────────────────────────────────────────────────
const financialTransactionSchema = new Schema(
  {
    tenantId: {
      type:     Schema.Types.ObjectId,
      ref:      'Tenant',
      required: [true, 'tenantId es obligatorio'],
    },

    // Monto cifrado — nunca exponer el string raw al cliente
    encryptedAmount: {
      type:     String,
      required: [true, 'El monto es obligatorio'],
      select:   false,
    },

    type: {
      type:     String,
      enum:     { values: Object.values(TRANSACTION_TYPES), message: 'type inválido' },
      required: [true, 'type es obligatorio'],
    },

    // Categoría libre: "Venta al contado", "Alquiler", "Insumos", etc.
    categoryId: {
      type: Schema.Types.ObjectId,
      ref:  'Category',
    },

    // Etiqueta de texto libre como alternativa rápida a categoryId
    categoryLabel: {
      type:      String,
      trim:      true,
      maxlength: [80, 'La etiqueta no puede superar 80 caracteres'],
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: [300, 'La descripción no puede superar 300 caracteres'],
    },

    paymentMethod: {
      type:    String,
      enum:    { values: Object.values(PAYMENT_METHODS), message: 'Método de pago inválido' },
      default: PAYMENT_METHODS.CASH,
    },

    // Referencia cruzada a otro módulo (factura, orden de compra, etc.)
    referenceId:    { type: Schema.Types.ObjectId },
    referenceModel: {
      type:    String,
      enum:    ['Invoice', 'PurchaseOrder', 'StockMovement', null],
      default: null,
    },

    note: {
      type:      String,
      trim:      true,
      maxlength: [300, 'La nota no puede superar 300 caracteres'],
    },

    // Fecha efectiva (puede diferir de createdAt en importaciones históricas)
    effectiveDate: {
      type:    Date,
      default: () => new Date(),
    },

    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'createdBy es obligatorio'],
    },
  },
  { timestamps: true }
);

// ── Índices ───────────────────────────────────────────────────────────────────
// tenantId siempre primero — garantiza que MongoDB use el índice en queries multi-tenant
financialTransactionSchema.index(
  { tenantId: 1, effectiveDate: -1 },
  { name: 'idx_tenant_date' }
);
financialTransactionSchema.index(
  { tenantId: 1, type: 1, effectiveDate: -1 },
  { name: 'idx_tenant_type_date' }
);
financialTransactionSchema.index(
  { tenantId: 1, categoryId: 1, effectiveDate: -1 },
  { name: 'idx_tenant_category_date' }
);
financialTransactionSchema.index(
  { tenantId: 1, paymentMethod: 1 },
  { name: 'idx_tenant_payment' }
);

// ── Inmutabilidad ─────────────────────────────────────────────────────────────
financialTransactionSchema.pre('save', function (next) {
  if (!this.isNew) {
    const err  = new Error('Las transacciones financieras son inmutables. Crea un ADJUSTMENT para corregir.');
    err.name   = 'ImmutableDocumentError';
    err.status = 403;
    return next(err);
  }

  // ADJUSTMENT requiere nota explicativa
  if (this.type === TRANSACTION_TYPES.ADJUSTMENT && !this.note?.trim()) {
    const err  = new Error('ADJUSTMENT requiere una nota explicativa.');
    err.name   = 'ValidationError';
    err.status = 422;
    return next(err);
  }

  next();
});

financialTransactionSchema.pre(
  ['updateOne', 'findOneAndUpdate', 'updateMany'],
  function (next) {
    const err  = new Error('Actualización no permitida en colección inmutable.');
    err.name   = 'ImmutableDocumentError';
    err.status = 403;
    next(err);
  }
);

// ── Virtual: monto descifrado ─────────────────────────────────────────────────
financialTransactionSchema.virtual('amount').get(function () {
  return this.encryptedAmount ? decryptNumber(this.encryptedAmount) : null;
});

// ── Método estático: construir transacción con cifrado ────────────────────────
financialTransactionSchema.statics.build = function ({ amount, ...rest }) {
  return new this({ ...rest, encryptedAmount: encrypt(amount) });
};

// ── Métodos estáticos de agregación (el corazón del ledger) ──────────────────

/**
 * Balance actual del tenant.
 * INCOME suma, EXPENSE resta, ADJUSTMENT puede ser ambos (depende del signo).
 *
 * Nota: los montos están cifrados en BD, así que la suma la hacemos
 * en memoria después de descifrar. Para datasets grandes, considerar
 * mantener un snapshot diario en una colección separada.
 */
financialTransactionSchema.statics.getBalance = async function (tenantId, { from, to } = {}) {
  const filter = { tenantId };
  if (from || to) {
    filter.effectiveDate = {};
    if (from) filter.effectiveDate.$gte = new Date(from);
    if (to)   filter.effectiveDate.$lte = new Date(to);
  }

  // Traer todos los montos cifrados del período
  const transactions = await this
    .find(filter)
    .select('+encryptedAmount')
    .lean({ virtuals: true });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amt = tx.amount ?? 0;
    if (tx.type === TRANSACTION_TYPES.INCOME)  totalIncome  += amt;
    if (tx.type === TRANSACTION_TYPES.EXPENSE) totalExpense += amt;
    // ADJUSTMENT: monto positivo = ingreso, negativo = egreso
    if (tx.type === TRANSACTION_TYPES.ADJUSTMENT) {
      if (amt >= 0) totalIncome  += amt;
      else          totalExpense += Math.abs(amt);
    }
  }

  return {
    totalIncome:   Number(totalIncome.toFixed(2)),
    totalExpense:  Number(totalExpense.toFixed(2)),
    balance:       Number((totalIncome - totalExpense).toFixed(2)),
  };
};

/**
 * Resumen por categoría en un período.
 * Útil para el dashboard de gastos por rubro.
 * Los montos se descifran en memoria y se agrupan por categoryLabel.
 */
financialTransactionSchema.statics.getSummaryByCategory = async function (tenantId, { from, to, type } = {}) {
  const filter = { tenantId };
  if (type) filter.type = type;
  if (from || to) {
    filter.effectiveDate = {};
    if (from) filter.effectiveDate.$gte = new Date(from);
    if (to)   filter.effectiveDate.$lte = new Date(to);
  }

  const transactions = await this
    .find(filter)
    .select('+encryptedAmount')
    .lean({ virtuals: true });

  // Agrupar en memoria
  const groups = {};
  for (const tx of transactions) {
    const key = tx.categoryLabel ?? 'Sin categoría';
    if (!groups[key]) groups[key] = { category: key, total: 0, count: 0 };
    groups[key].total += tx.amount ?? 0;
    groups[key].count += 1;
  }

  return Object.values(groups)
    .map((g) => ({ ...g, total: Number(g.total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
};

/**
 * Serie temporal: total de INCOME y EXPENSE agrupado por día/mes.
 * Útil para el gráfico de evolución de caja.
 */
financialTransactionSchema.statics.getTimeSeries = async function (tenantId, { from, to, groupBy = 'day' } = {}) {
  const filter = { tenantId };
  if (from || to) {
    filter.effectiveDate = {};
    if (from) filter.effectiveDate.$gte = new Date(from);
    if (to)   filter.effectiveDate.$lte = new Date(to);
  }

  const transactions = await this
    .find(filter)
    .select('+encryptedAmount')
    .sort({ effectiveDate: 1 })
    .lean({ virtuals: true });

  // Agrupar por período en memoria
  const series = {};
  for (const tx of transactions) {
    const d   = new Date(tx.effectiveDate);
    const key = groupBy === 'month'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!series[key]) series[key] = { period: key, income: 0, expense: 0 };
    const amt = tx.amount ?? 0;
    if (tx.type === TRANSACTION_TYPES.INCOME)  series[key].income  += amt;
    if (tx.type === TRANSACTION_TYPES.EXPENSE) series[key].expense += amt;
  }

  return Object.values(series).map((s) => ({
    period:  s.period,
    income:  Number(s.income.toFixed(2)),
    expense: Number(s.expense.toFixed(2)),
    net:     Number((s.income - s.expense).toFixed(2)),
  }));
};

// ── Serializer seguro ─────────────────────────────────────────────────────────
financialTransactionSchema.methods.toSafeObject = function () {
  return {
    id:            this._id,
    tenantId:      this.tenantId,
    amount:        this.amount,        // descifrado
    type:          this.type,
    categoryId:    this.categoryId,
    categoryLabel: this.categoryLabel,
    description:   this.description,
    paymentMethod: this.paymentMethod,
    referenceId:   this.referenceId,
    referenceModel: this.referenceModel,
    note:          this.note,
    effectiveDate: this.effectiveDate,
    createdBy:     this.createdBy,
    createdAt:     this.createdAt,
  };
};

export const FinancialTransaction = mongoose.model('FinancialTransaction', financialTransactionSchema);
