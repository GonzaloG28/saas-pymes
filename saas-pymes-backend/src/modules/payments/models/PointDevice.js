import mongoose from 'mongoose';
const { Schema } = mongoose;

const pointDeviceSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    deviceId: { type: String, required: true, trim: true }, // ID de la terminal Point, dado por MP
    label:    { type: String, trim: true, maxlength: 60 },  // nombre amigable, ej. "Caja 1"
    isActive: { type: Boolean, default: true },
    linkedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedMpAccessToken: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// Un mismo deviceId NUNCA puede pertenecer a dos tenants — esto es lo que previene el cruce de pagos
pointDeviceSchema.index({ deviceId: 1 }, { unique: true, name: 'idx_device_unique_global' });
pointDeviceSchema.index({ tenantId: 1, isActive: 1 }, { name: 'idx_tenant_active_devices' });

pointDeviceSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    deviceId: this.deviceId,
    label: this.label,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('PointDevice', pointDeviceSchema);