import mongoose from 'mongoose';
import crypto   from 'crypto';

const { Schema } = mongoose;

const onboardingTokenSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true }, // nunca se guarda el token en texto plano
    expiresAt: { type: Date, required: true },
    usedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);
onboardingTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL — Mongo lo borra solo al expirar

// ── Generar un token nuevo, devuelve el valor SIN hashear (para enviarlo al usuario) ──
onboardingTokenSchema.statics.issue = async function (tenantId, userId, ttlHours = 72) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await this.create({
    tenantId,
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  });

  return rawToken; // esto va en el link/código que se le manda al cliente
};

onboardingTokenSchema.statics.verify = async function (rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = await this.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } });
  return record; // null si es inválido/expirado/usado
};

export default mongoose.model('OnboardingToken', onboardingTokenSchema);