import mongoose from 'mongoose';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import Order, { ORDER_STATUS } from '../models/Order.js';
import Product from '../../products/models/Product.js';
import PointDevice from '../models/PointDevice.js';
import { StockMovement, MOVEMENT_TYPES } from '../../stock/models/StockMovement.js';
import { Sale } from '../../sales/models/sale.js'
import { decrypt } from '../../../shared/encryption/fieldEncryption.js';
import { AppError } from '../../../core/errors/appError.js';

class WebhookService {
  async handleMercadoPagoNotification(payload) {
    if (payload.type !== 'payment') return { skipped: true };

    const paymentId = payload.data?.id;
    if (!paymentId) throw new AppError('Payload de webhook inválido: falta payment id', 400, 'INVALID_WEBHOOK_PAYLOAD');

    const payment = await this._fetchPaymentDetailsTryingAllTenants(paymentId);
    if (!payment) {
      // Ninguno de los tokens vinculados pudo leer este pago — no es de ningún tenant nuestro
      return { skipped: true, reason: 'payment not found under any linked tenant token' };
    }

    if (payment.status !== 'approved') {
      return { skipped: true, reason: `payment status is ${payment.status}` };
    }

    const externalReference = payment.external_reference;
    if (!externalReference || !externalReference.includes(':'))
      throw new AppError('external_reference inválido o ausente', 400, 'INVALID_EXTERNAL_REFERENCE');

    const [tenantId, orderId] = externalReference.split(':');

    return this._processApprovedPayment({ tenantId, orderId, payment });
  }

  // Prueba con el token de cada dispositivo activo hasta encontrar el que puede leer este pago.
  // Funciona bien a escala chica/mediana. Para muchos tenants, migrar a OAuth de Marketplace
  // (cada tenant autoriza tu app una vez, vos guardás su token vía flujo OAuth real) —
  // ahí la app sabría de antemano qué tenant hizo cada pago, sin necesitar probar tokens.
  async _fetchPaymentDetailsTryingAllTenants(paymentId) {
    const devices = await PointDevice.find({ isActive: true }).select('+encryptedMpAccessToken');

    for (const device of devices) {
      try {
        const token = decrypt(device.encryptedMpAccessToken);
        const client = new MercadoPagoConfig({ accessToken: token });
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: paymentId });
        if (payment) return payment; // encontrado — este token pudo leerlo
      } catch {
        continue; // este token no tiene acceso a este pago, seguimos probando con el próximo
      }
    }

    return null; // ningún token pudo leerlo
  }

  async _processApprovedPayment({ tenantId, orderId, payment }) {
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOne({ _id: orderId, tenantId }).session(session);
      if (!order) throw new AppError('Orden no encontrada para este tenant', 404, 'ORDER_NOT_FOUND');
      if (order.status === ORDER_STATUS.PAID) {
        await session.abortTransaction();
        return { alreadyProcessed: true, orderId };
      }

      order.status = ORDER_STATUS.PAID;
      order.receipt = {
        paymentMethod:   payment.payment_method_id,
        lastFourDigits:  payment.card?.last_four_digits ?? null,
        operationNumber: payment.authorization_code ?? String(payment.id),
        paidAt:          new Date(payment.date_approved ?? Date.now()),
        mpPaymentId:     String(payment.id),
      };
      await order.save({ session });

      for (const item of order.items) {
        const product = await Product.findOne({ _id: item.productId, tenantId })
          .select('+encryptedCost')
          .session(session);
        if (!product) throw new AppError(`Producto ${item.productId} no encontrado`, 404, 'PRODUCT_NOT_FOUND');

        const currentStock = await StockMovement.getCurrentStock(
          tenantObjId,
          new mongoose.Types.ObjectId(item.productId)
        );
        if (currentStock - item.quantity < 0)
          throw new AppError(`Stock insuficiente para "${product.name}"`, 409, 'INSUFFICIENT_STOCK');

        await StockMovement.create([{
          tenantId,
          productId: item.productId,
          quantityChange: -Math.abs(item.quantity),
          type: MOVEMENT_TYPES.OUT,
          note: `Venta Mercado Pago Point — orden ${order._id}`,
          referenceId: order._id,
          referenceModel: 'Invoice',
          createdBy: order.createdBy,
        }], { session });
      }

      for (const item of order.items) {
        const product = await Product.findOne({ _id: item.productId, tenantId })
          .select('+encryptedCost').session(session);
        await Sale.create([{
          tenantId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: product.cost,
          total: item.unitPrice * item.quantity,
          profit: (item.unitPrice - product.cost) * item.quantity,
          paymentMethod: 'card', // ← agregar: todo pago vía Point es tarjeta
          note: `Pago Mercado Pago Point — orden ${order._id}`,
          createdBy: order.createdBy,
        }], { session });
      }

      await session.commitTransaction();
      return { success: true, orderId: order._id };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default new WebhookService();