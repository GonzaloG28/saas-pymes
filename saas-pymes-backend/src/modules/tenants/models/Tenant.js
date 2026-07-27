// modules/tenants/models/Tenant.js

import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TENANT_STATUS = Object.freeze({
  ACTIVE:    'active',
  SUSPENDED: 'suspended',  // pago vencido
  CANCELLED: 'cancelled',  // baja definitiva
});

export const TENANT_PLANS = Object.freeze({
  FREE:  'free',   // límite de productos/transacciones
  BASIC: 'basic',
  PRO:   'pro',
});

// Límites por plan — usados en TenantService para validar cuotas
export const PLAN_LIMITS = Object.freeze({
  [TENANT_PLANS.FREE]:  { maxProducts: 50,   maxUsersPerTenant: 2  },
  [TENANT_PLANS.BASIC]: { maxProducts: 500,  maxUsersPerTenant: 5  },
  [TENANT_PLANS.PRO]:   { maxProducts: 9999, maxUsersPerTenant: 20 },
});

const tenantSchema = new Schema(
  {
    // ── Identidad ─────────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'El nombre de la empresa es obligatorio'],
      trim:      true,
      minlength: [2,   'El nombre debe tener al menos 2 caracteres'],
      maxlength: [120, 'El nombre no puede superar 120 caracteres'],
    },

    // Slug único: identificador URL-safe generado del nombre
    // Usado para identificar el tenant en login sin exponer el _id
    slug: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^[a-z0-9\-]+$/, 'Slug inválido'],
    },

    // Email de contacto principal (del owner)
    contactEmail: {
      type:      String,
      required:  [true, 'El email de contacto es obligatorio'],
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },

    // Teléfono opcional para soporte
    contactPhone: {
      type:    String,
      trim:    true,
      maxlength: [20, 'Teléfono no puede superar 20 caracteres'],
    },

    // País — útil para moneda, formato de fechas y regulaciones futuras
    country: {
      type:    String,
      trim:    true,
      default: 'CL',
      maxlength: [2, 'Usar código ISO 3166-1 alpha-2 (ej: CL, AR, MX)'],
    },

    // ── Plan y estado ─────────────────────────────────────────────────────────
    plan: {
      type:    String,
      enum:    { values: Object.values(TENANT_PLANS), message: 'Plan inválido' },
      default: TENANT_PLANS.FREE,
    },

    status: {
      type:    String,
      enum:    { values: Object.values(TENANT_STATUS), message: 'Status inválido' },
      default: TENANT_STATUS.ACTIVE,
      index:   true,
    },

    // Fecha de vencimiento del plan (null = free o sin vencimiento)
    planExpiresAt: {
      type: Date,
      default: null,
    },

    // ── Auditoría interna ─────────────────────────────────────────────────────
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

// ── Índices ───────────────────────────────────────────────────────────────────
tenantSchema.index({ slug: 1 },          { unique: true, name: 'idx_slug_unique' });
tenantSchema.index({ contactEmail: 1 },  { name: 'idx_contact_email' });
tenantSchema.index({ status: 1, plan: 1 }, { name: 'idx_status_plan' });

// ── Virtual: ¿el plan está vigente? ──────────────────────────────────────────
tenantSchema.virtual('isPlanActive').get(function () {
  if (!this.planExpiresAt) return true;           // free o sin vencimiento
  return this.planExpiresAt > new Date();
});

// ── Método: obtener límites del plan actual ───────────────────────────────────
tenantSchema.methods.getLimits = function () {
  return PLAN_LIMITS[this.plan] ?? PLAN_LIMITS[TENANT_PLANS.FREE];
};

// ── Serializer seguro ─────────────────────────────────────────────────────────
tenantSchema.methods.toSafeObject = function () {
  return {
    id:           this._id,
    name:         this.name,
    slug:         this.slug,
    contactEmail: this.contactEmail,
    country:      this.country,
    plan:         this.plan,
    status:       this.status,
    isPlanActive: this.isPlanActive,
    planExpiresAt: this.planExpiresAt,
    createdAt:    this.createdAt,
  };
};

export default mongoose.model('Tenant', tenantSchema);
