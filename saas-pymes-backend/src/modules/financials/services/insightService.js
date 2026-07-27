// modules/financials/services/insightService.js (nuevo)

import mongoose from 'mongoose';
import { StockMovement } from '../../stock/models/StockMovement.js';
import { Sale } from '../../sales/models/Sale.js';
import Product from '../../products/models/Product.js';

class InsightService {
  // Productos con stock alto pero pocas o ninguna venta reciente → capital inmovilizado
  async getStagnantStockInsights(tenantId, { daysThreshold = 30, minStockUnits = 10 } = {}) {
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const since = new Date(); since.setDate(since.getDate() - daysThreshold);

    const [stockSnapshot, recentSalesByProduct] = await Promise.all([
      StockMovement.getStockSnapshot(tenantObjId),
      Sale.aggregate([
        { $match: { tenantId: tenantObjId, soldAt: { $gte: since } } },
        { $group: { _id: '$productId', unitsSold: { $sum: '$quantity' } } },
      ]),
    ]);

    const soldMap = new Map(recentSalesByProduct.map((r) => [String(r._id), r.unitsSold]));
    const stagnant = stockSnapshot.filter((s) => s.stock >= minStockUnits && !soldMap.has(String(s.productId)));

    if (!stagnant.length) return [];

    const products = await Product.find({ _id: { $in: stagnant.map((s) => s.productId) } }).select('+encryptedCost name sku');
    return stagnant.map((s) => {
      const product = products.find((p) => String(p._id) === String(s.productId));
      return {
        productId: s.productId,
        name: product?.name,
        sku: product?.sku,
        stockUnits: s.stock,
        capitalTiedUp: (product?.cost ?? 0) * s.stock, // dinero "dormido" en ese producto
        daysWithoutSale: daysThreshold, // aproximado — podría refinarse con la última venta real
      };
    }).sort((a, b) => b.capitalTiedUp - a.capitalTiedUp);
  }

  // Márgenes que están cayendo: compara margen promedio de este mes vs el anterior, por producto
  async getShrinkingMarginInsights(tenantId) {
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const rows = await Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: lastMonthStart } } },
      {
        $group: {
          _id: {
            productId: '$productId',
            period: { $cond: [{ $gte: ['$soldAt', thisMonthStart] }, 'current', 'previous'] },
          },
          avgMarginPct: { $avg: { $multiply: [{ $divide: [{ $subtract: ['$unitPrice', '$unitCost'] }, '$unitPrice'] }, 100] } },
        },
      },
      {
        $group: {
          _id: '$_id.productId',
          periods: { $push: { period: '$_id.period', avgMarginPct: '$avgMarginPct' } },
        },
      },
    ]);

    const results = rows.map((r) => {
      const current  = r.periods.find((p) => p.period === 'current')?.avgMarginPct;
      const previous = r.periods.find((p) => p.period === 'previous')?.avgMarginPct;
      if (current == null || previous == null) return null;
      const dropPct = previous - current;
      return dropPct > 2 ? { productId: r._id, currentMarginPct: current, previousMarginPct: previous, dropPct } : null;
    }).filter(Boolean);

    const productIds = results.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds } }).select('name sku');
    return results.map((r) => ({
      ...r,
      name: products.find((p) => String(p._id) === String(r.productId))?.name,
    })).sort((a, b) => b.dropPct - a.dropPct);
  }
}

export default new InsightService();