// modules/auth/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcrypt'

const { Schema } = mongoose;

const ROLES       = ['owner', 'admin', 'staff'];
const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCK_TIME    = 30 * 60 * 1000; // 30 min

const userSchema = new Schema(
  {
    tenantId: {
      type:     Schema.Types.ObjectId,
      ref:      'Tenant',
      required: [true, 'tenantId es obligatorio'],
      index:    true,
    },
    email: {
      type:      String,
      required:  [true, 'Email es obligatorio'],
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type:    String,
      enum:    { values: ROLES, message: `Rol debe ser: ${ROLES.join(', ')}` },
      default: 'staff',
    },
    isActive:         { type: Boolean, default: true },
    loginAttempts:    { type: Number, default: 0, select: false },
    lockUntil:        { type: Date, select: false },
    refreshTokenHash: { type: String, select: false },
    lastLoginAt:      Date,

  mustChangePassword: {
    type:    Boolean,
    default: true, // true al crear el usuario vía superadmin; false tras el primer cambio
  },
  passwordSetAt: {
    type:    Date,
    default: null, // se llena cuando el usuario define su contraseña definitiva
  },

  // ── Aceptación de términos y política de datos ───────────────────────────
  termsAcceptedAt: {
    type:    Date,
    default: null,
  },
  termsAcceptedVersion: {
    type:    String,
    default: null, // ej: "v1.0" — para saber si hay que re-pedir aceptación tras cambios legales
  },
  
}, { timestamps: true });

userSchema.index({ tenantId: 1, email: 1 }, { unique: true, name: 'idx_tenant_email' });

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.recordFailedAttempt = function () {
  if (this.lockUntil && this.lockUntil < Date.now())
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });

  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS)
    update.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };

  return this.updateOne(update);
};

userSchema.methods.recordSuccessfulLogin = function () {
  return this.updateOne({
    $set:   { lastLoginAt: new Date(), loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.toSafeObject = function () {
  return {
    id:          this._id,
    tenantId:    this.tenantId,
    email:       this.email,
    role:        this.role,
    isActive:    this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt:   this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
