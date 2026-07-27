import Order, { ORDER_STATUS } from '../models/Order.js';
import pointDeviceService from './pointDeviceService.js';
import { pointClient } from '../../../shared/mercadopago/mpClient.js';
import { AppError } from '../../../core/errors/appError.js';

class PaymentIntentService {
  async chargeOrder(tenantId, orderId) {
    // 1. Buscar la orden — SIEMPRE filtrado por tenantId
    const order = await Order.findOne({ _id: orderId, tenantId });
    if (!order) throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    if (order.status !== ORDER_STATUS.PENDING)
      throw new AppError(`La orden ya está en estado "${order.status}"`, 409, 'ORDER_NOT_PENDING');

    // 2. Buscar el dispositivo Point vinculado a este tenant
    const device = await pointDeviceService.getActiveDevice(tenantId);

    // 3. external_reference es la pieza CRÍTICA de trazabilidad —
    //    el webhook usa esta cadena para saber a qué tenant y orden pertenece el pago
    const externalReference = `${tenantId}:${order._id}`;

    try {
      const paymentIntent = await pointClient.createPaymentIntent({
        device_id: device.deviceId,
        request: {
          amount: Math.round(order.totalAmount * 100), // MP espera el monto en centavos
          external_reference: externalReference,
          additional_info: {
            print_on_terminal: true,
          },
        },
      });

      return { order: order.toSafeObject(), paymentIntent };
    } catch (err) {
      throw new AppError('Error al conectar con la terminal de pago', 502, 'MP_POINT_ERROR');
    }
  }
}

export default new PaymentIntentService();