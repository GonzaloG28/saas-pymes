import PointDevice from '../models/PointDevice.js';
import { encrypt } from '../../../shared/encryption/fieldEncryption.js';
import { AppError } from '../../../core/errors/appError.js';

class PointDeviceService {
  async link(tenantId, userId, { deviceId, label, mpAccessToken }) {
  if (!mpAccessToken) throw new AppError('Debes ingresar tu Access Token de Mercado Pago', 422, 'MISSING_MP_TOKEN');

  const existing = await PointDevice.findOne({ deviceId });
  if (existing) {
    if (String(existing.tenantId) !== String(tenantId)) {
      throw new AppError('Este dispositivo ya está vinculado a otra empresa', 409, 'DEVICE_ALREADY_LINKED');
    }
    existing.isActive = true;
    existing.encryptedMpAccessToken = encrypt(mpAccessToken);
    if (label) existing.label = label;
    await existing.save();

    // Al reactivar este, desactivar cualquier OTRO dispositivo activo del mismo tenant
    await PointDevice.updateMany(
      { tenantId, _id: { $ne: existing._id } },
      { $set: { isActive: false } }
    );
    return existing;
  }

  const device = await PointDevice.create({
    tenantId, deviceId, label, linkedBy: userId,
    encryptedMpAccessToken: encrypt(mpAccessToken),
  });

  // Nuevo dispositivo vinculado → desactivar todos los demás del tenant
  await PointDevice.updateMany(
    { tenantId, _id: { $ne: device._id } },
    { $set: { isActive: false } }
  );

  return device;
}

  async getActiveDevice(tenantId) {
    const device = await PointDevice.findOne({ tenantId, isActive: true }).select('+encryptedMpAccessToken');
    if (!device) throw new AppError('No hay ninguna terminal Point vinculada a tu empresa', 404, 'NO_DEVICE_LINKED');
    return device;
  }

  async listByTenant(tenantId) {
    return PointDevice.find({ tenantId });
  }

  async unlink(tenantId, deviceId) {
    const device = await PointDevice.findOne({ tenantId, deviceId });
    if (!device) throw new AppError('Dispositivo no encontrado', 404, 'DEVICE_NOT_FOUND');
    device.isActive = false;
    await device.save();
    return device;
  }
}

export default new PointDeviceService();