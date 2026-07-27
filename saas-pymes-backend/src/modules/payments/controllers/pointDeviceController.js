import pointDeviceService from '../services/pointDeviceService.js';

export const linkDevice = async (req, res, next) => {
  try {
    const device = await pointDeviceService.link(req.tenantId, req.userId, req.body);
    res.status(201).json({ data: device.toSafeObject() });
  } catch (err) { next(err); }
};

export const listDevices = async (req, res, next) => {
  try {
    const devices = await pointDeviceService.listByTenant(req.tenantId);
    res.json({ data: devices.map((d) => d.toSafeObject()) });
  } catch (err) { next(err); }
};

export const unlinkDevice = async (req, res, next) => {
  try {
    const device = await pointDeviceService.unlink(req.tenantId, req.params.deviceId);
    res.json({ data: device.toSafeObject() });
  } catch (err) { next(err); }
};