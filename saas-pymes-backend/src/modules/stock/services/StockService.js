// modules/stock/services/StockService.js

import mongoose        from 'mongoose';
import { StockMovement, MOVEMENT_TYPES } from '../models/StockMovement.js';
import Product         from '../../products/models/Product.js';
import { encrypt }     from '../../../shared/encryption/fieldEncryption.js';
import { AppError } from '../../../core/errors/appError.js';

class StockService {

  async registerMovement(tenantId, userId, data) {
    const { productId, quantity, type, note, referenceId, referenceModel, effectiveDate } = data;

    // Traemos el costo cifrado para poder snapshotearlo si es una entrada
    const product = await Product.findOne({ _id: productId, tenantId, isActive: true }).select('+encryptedCost');
    if (!product) throw new AppError('Producto no encontrado o inactivo', 404, 'PRODUCT_NOT_FOUND');

    const isOut = [MOVEMENT_TYPES.OUT, MOVEMENT_TYPES.LOSS].includes(type);
    const quantityChange = isOut ? -Math.abs(quantity) : Math.abs(quantity);

    if (isOut) {
      const currentStock = await StockMovement.getCurrentStock(
        new mongoose.Types.ObjectId(tenantId),
        new mongoose.Types.ObjectId(productId)
      );
      if (currentStock + quantityChange < 0)
        throw new AppError(`Stock insuficiente. Stock actual: ${currentStock}`, 409, 'INSUFFICIENT_STOCK');
    }

    // Snapshot del costo SOLO en entradas — así el egreso queda fijo aunque el costo cambie después
    let encryptedUnitCostSnapshot;
    if (type === MOVEMENT_TYPES.IN) {
      if (product.cost == null)
        throw new AppError('El producto no tiene costo definido, no se puede registrar la entrada', 422, 'MISSING_PRODUCT_COST');
      encryptedUnitCostSnapshot = encrypt(product.cost);
    }

    const movement = new StockMovement({
      tenantId,
      productId,
      quantityChange,
      type,
      note,
      referenceId,
      referenceModel,
      encryptedUnitCostSnapshot,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      createdBy: userId,
    });

    await movement.save();
    return movement;
  }



  async getMovements(tenantId, { productId, type, from, to, page = 1, limit = 20 } = {}) {
  const filter = {
    tenantId,
    hiddenFromHistory: { $ne: true }, 
  }; 
  if (productId) filter.productId = productId;
  if (type)      filter.type      = type;
  if (from || to) {
    filter.effectiveDate = {};
    if (from) filter.effectiveDate.$gte = new Date(from);
    if (to)   filter.effectiveDate.$lte = new Date(to);
  }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage  = Math.max(1, parseInt(page, 10) || 1);

    const [movements, total] = await Promise.all([
      StockMovement
        .find(filter)
        .sort({ effectiveDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('productId', 'sku name'),
      StockMovement.countDocuments(filter),
    ]);

    return { data: movements, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }

   async getTopSelling({ from, to, limit = 3 } = {}) {
  const params = { limit };
  if (from) params.from = from;
  if (to)   params.to   = to;
  const { data } = await api.get('/stock/top-selling', { params });
  return data.data; // [{ productId, name, sku, unitsSold }]
 }

  async getCurrentStock(tenantId, productId) {
    return StockMovement.getCurrentStock(
      new mongoose.Types.ObjectId(tenantId),
      new mongoose.Types.ObjectId(productId)
    );
  }

  async getStockSnapshot(tenantId) {
    return StockMovement.getStockSnapshot(new mongoose.Types.ObjectId(tenantId));
  }

 async clearMovements(tenantId, { scope, date } = {}) {
  const filter = { tenantId };

  if (scope === 'day' && date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    filter.effectiveDate = { $gte: start, $lte: end };
  } else if (scope === 'month' && date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    filter.effectiveDate = { $gte: start, $lte: end };
  }
  // scope === 'all' → sin filtro extra de fecha

  const result = await StockMovement.updateMany(filter, { $set: { hiddenFromHistory: true } });
  return { archivedCount: result.modifiedCount };
}
}

export default new StockService();
