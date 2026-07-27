import Order, { ORDER_STATUS } from '../models/Order.js';
import Product from '../../products/models/Product.js';
import { AppError } from '../../../core/errors/appError.js';

class OrderService {
  async create(tenantId, userId, { items }) {
    if (!Array.isArray(items) || items.length === 0)
      throw new AppError('La orden debe tener al menos un producto', 422, 'EMPTY_ORDER');

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, tenantId, isActive: true })
      .select('+encryptedPrice');

    if (products.length !== new Set(productIds.map(String)).size)
      throw new AppError('Uno o más productos no existen o no pertenecen a tu empresa', 404, 'PRODUCT_NOT_FOUND');

    let totalAmount = 0;
    const orderItems = items.map(({ productId, quantity }) => {
      const product = products.find((p) => String(p._id) === String(productId));
      if (quantity <= 0) throw new AppError('Cantidad inválida en uno de los productos', 422, 'INVALID_QUANTITY');
      const unitPrice = product.price;
      totalAmount += unitPrice * quantity;
      return { productId, quantity, unitPrice };
    });

    const order = await Order.create({
      tenantId,
      items: orderItems,
      totalAmount,
      status: ORDER_STATUS.PENDING,
      createdBy: userId,
    });

    return order;
  }

  async getById(tenantId, orderId) {
    const order = await Order.findOne({ _id: orderId, tenantId });
    if (!order) throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    return order;
  }
}

export default new OrderService();