import mongoose from 'mongoose';
import { Sale } from '../models/sale.js';
import Product from '../../products/models/Product.js';
import stockService from '../../stock/services/StockService.js';
import { StockMovement, MOVEMENT_TYPES } from '../../stock/models/StockMovement.js';
import { AppError } from '../../../core/errors/appError.js';

class SaleService {


async registerSale(tenantId, userId, { productId, quantity, unitPrice, note, paymentMethod }) {
    if (!quantity || quantity <= 0) throw new AppError('Cantidad inválida', 422, 'INVALID_QUANTITY');

    const product = await Product.findOne({ _id: productId, tenantId, isActive: true })
      .select('+encryptedCost +encryptedPrice');
    if (!product) throw new AppError('Producto no encontrado o inactivo', 404, 'PRODUCT_NOT_FOUND');

    if (product.cost == null || product.price == null) {
      throw new AppError('El producto no tiene costo/precio definido', 422, 'MISSING_PRODUCT_COST');
    }

    const price = unitPrice != null ? Number(unitPrice) : product.price;
    if (price < 0) throw new AppError('Precio inválido', 422, 'INVALID_PRICE');

    const movement = await stockService.registerMovement(tenantId, userId, {
      productId,
      quantity,
      type: 'OUT',
      note: note || `Venta`,
      referenceModel: 'Invoice',
    });

    const total  = price * quantity;
    const profit = (price - product.cost) * quantity;

    const sale = await Sale.create({
    tenantId,
    productId,
    quantity,
    unitPrice: price,
    unitCost: product.cost,
    total,
    profit,
    note,
    paymentMethod: paymentMethod || 'cash', // default efectivo
    createdBy: userId,
  });

    const newStock = await stockService.getCurrentStock(tenantId, productId);
    
    return { sale, movement, newStock, profit };
  }




async listSales(tenantId, { from, to, page = 1, limit = 20 } = {}) {
    const filter = {
    tenantId,
    hiddenFromHistory: { $ne: true }, // ← acepta false Y documentos sin el campo
  };
    if (from || to) {
      filter.soldAt = {};
      if (from) filter.soldAt.$gte = new Date(from);
      if (to)   filter.soldAt.$lte = new Date(to);
    }
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const safePage  = Math.max(1, parseInt(page, 10) || 1);

    const [data, total] = await Promise.all([
      Sale.find(filter).sort({ soldAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit)
        .populate('productId', 'sku name'),
      Sale.countDocuments(filter),
    ]);
    return { data, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }



  
async getProfitLossSummary(tenantId) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart   = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  const [result] = await Sale.aggregate([
    { $match: { tenantId: tenantObjId, soldAt: { $gte: monthStart } } }, 
    {
      $facet: {
        today: [
          { $match: { soldAt: { $gte: todayStart } } },
          { $group: { _id: null, income: { $sum: '$total' }, profit: { $sum: '$profit' } } },
        ],
        week: [
          { $match: { soldAt: { $gte: weekStart } } },
          { $group: { _id: null, income: { $sum: '$total' }, profit: { $sum: '$profit' } } },
        ],
        month: [
          { $group: { _id: null, income: { $sum: '$total' }, profit: { $sum: '$profit' } } },
        ],
      },
    },
  ]);

  const shape = (arr) => ({ income: arr[0]?.income ?? 0, profit: arr[0]?.profit ?? 0 });
  return {
    today: shape(result.today),
    week:  shape(result.week),
    month: shape(result.month),
  };
}




_rangeToDates(range) {
  const now = new Date();
  if (range === 'week') {
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now };
  }
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  return { from, to: now }; // day
}




async getBalance(tenantId, { range = 'day' } = {}) {
  const { from, to } = this._rangeToDates(range);
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId), soldAt: { $gte: from, $lte: to } };

  const [result] = await Sale.aggregate([
    { $match: match },
    { $group: { _id: null, totalIncome: { $sum: '$total' }, totalProfit: { $sum: '$profit' }, unitsSold: { $sum: '$quantity' } } },
  ]);

  const totalIncome = result?.totalIncome ?? 0;
  const totalProfit = result?.totalProfit ?? 0;
  const unitsSold    = result?.unitsSold ?? 0;

  const totalExpense = await this.getPurchaseExpenses(tenantId, { from, to });

  const topProduct = await this.getTopProduct(tenantId, { range });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense, // flujo de caja real
    salesMargin: totalProfit,             // margen/ganancia contable de lo vendido
    unitsSold,
    topProduct,
  };
}




async getSalesFlow(tenantId, { startHour = 0, endHour = 24, range = 'day' } = {}) {
  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  // ── DÍA: agrupado por hora ────────────────────────────────────────────────
  if (range === 'day') {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(now); dayEnd.setHours(23, 59, 59, 999);

    const rows = await Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: dayStart, $lte: dayEnd } } },
      { $project: { hour: { $hour: { date: '$soldAt', timezone: 'America/Santiago' } }, quantity: 1 } },
      { $group: { _id: '$hour', unitsSold: { $sum: '$quantity' } } },
    ]);
    const byHour = Object.fromEntries(rows.map((r) => [r._id, r.unitsSold]));
    const labels = [], data = [];
    for (let h = startHour; h <= endHour; h++) { labels.push(`${h}:00`); data.push(byHour[h] ?? 0); }
    return { labels, data };
  }

  // ── SEMANA: agrupado por día (Lun, Mar, Mié...) ──────────────────────────
  if (range === 'week') {
    const now = new Date();
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);

    const rows = await Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: from, $lte: to } } },
      {
        $project: {
          dayKey: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt', timezone: 'America/Santiago' } },
          quantity: 1,
        },
      },
      { $group: { _id: '$dayKey', unitsSold: { $sum: '$quantity' } } },
    ]);

    const byDay = Object.fromEntries(rows.map((r) => [r._id, r.unitsSold]));
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const labels = [], data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d);
      labels.push(dayNames[d.getDay()]);
      data.push(byDay[dayKey] ?? 0);
    }
    return { labels, data };
  }

  // ── MES: agrupado por semana del mes ─────────────────────────────────────
  if (range === 'month') {
    const { from, to } = this._rangeToDates('month');
    const rows = await Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: from, $lte: to } } },
      {
        $project: {
          dayOfMonth: { $dayOfMonth: { date: '$soldAt', timezone: 'America/Santiago' } },
          quantity: 1,
        },
      },
      {
        $group: {
          _id: { $ceil: { $divide: ['$dayOfMonth', 7] } },
          unitsSold: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byWeek = Object.fromEntries(rows.map((r) => [r._id, r.unitsSold]));
    const now = new Date();
    const totalWeeks = Math.ceil(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / 7);
    const labels = [], data = [];
    for (let w = 1; w <= totalWeeks; w++) {
      labels.push(`Semana ${w}`);
      data.push(byWeek[w] ?? 0);
    }
    return { labels, data };
  }

  return { labels: [], data: [] };
}




async getTopProduct(tenantId, { range = 'day' } = {}) {
  const { from, to } = this._rangeToDates(range);
  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  const [top] = await Sale.aggregate([
    { $match: { tenantId: tenantObjId, soldAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$productId', unitsSold: { $sum: '$quantity' } } },
    { $sort: { unitsSold: -1 } },
    { $limit: 1 },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $project: { productId: '$_id', name: '$product.name', unitsSold: 1 } },
  ]);

  return top ?? null; // null si no hay ventas en el período
}




async getPurchaseExpenses(tenantId, { from, to } = {}) {
    const match = { tenantId: new mongoose.Types.ObjectId(tenantId), type: MOVEMENT_TYPES.IN };
    if (from || to) {
      match.effectiveDate = {};
      if (from) match.effectiveDate.$gte = from;
      if (to)   match.effectiveDate.$lte = to;
    }

    const movements = await StockMovement.find(match).select('+encryptedUnitCostSnapshot quantityChange');

    return movements.reduce((total, m) => {
      const unitCost = m.unitCostSnapshot ?? 0;
      return total + unitCost * m.quantityChange;
    }, 0);
  }




async getProductStats(tenantId, productId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const match = {
      tenantId:  new mongoose.Types.ObjectId(tenantId),
      productId: new mongoose.Types.ObjectId(productId),
    };

    const [totalRes, todayRes, monthRes, yearRes] = await Promise.all([
      Sale.aggregate([{ $match: match }, { $group: { _id: null, qty: { $sum: '$quantity' } } }]),
      Sale.aggregate([{ $match: { ...match, soldAt: { $gte: todayStart } } }, { $group: { _id: null, qty: { $sum: '$quantity' } } }]),
      Sale.aggregate([{ $match: { ...match, soldAt: { $gte: monthStart } } }, { $group: { _id: null, qty: { $sum: '$quantity' } } }]),
      Sale.aggregate([{ $match: { ...match, soldAt: { $gte: yearStart } } }, { $group: { _id: null, qty: { $sum: '$quantity' } } }]),
    ]);

    return {
      totalSold: totalRes[0]?.qty ?? 0,
      today:     todayRes[0]?.qty ?? 0,
      month:     monthRes[0]?.qty ?? 0,
      year:      yearRes[0]?.qty ?? 0,
    };
  }




async getProactiveAlerts(tenantId) {
  const tenantObjId = new mongoose.Types.ObjectId(tenantId);
  const now = new Date();

  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart  = new Date(now); lastWeekStart.setDate(now.getDate() - 14);
  const lastWeekEnd    = thisWeekStart;

  const [thisWeekRes, lastWeekRes] = await Promise.all([
    Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: thisWeekStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Sale.aggregate([
      { $match: { tenantId: tenantObjId, soldAt: { $gte: lastWeekStart, $lt: lastWeekEnd } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  const thisWeek = thisWeekRes[0]?.total ?? 0;
  const lastWeek = lastWeekRes[0]?.total ?? 0;

  const alerts = [];

  if (lastWeek > 0) {
    const changePct = ((thisWeek - lastWeek) / lastWeek) * 100;
    if (changePct <= -10) {
      alerts.push({
        type: 'warning',
        icon: 'trending-down',
        message: `Tus ventas de esta semana cayeron ${Math.abs(changePct).toFixed(0)}% respecto a la anterior`,
      });
    } else if (changePct >= 20) {
      alerts.push({
        type: 'success',
        icon: 'trending-up',
        message: `Tus ventas de esta semana subieron ${changePct.toFixed(0)}% respecto a la anterior`,
      });
    }
  }

 const marginRows = await Sale.aggregate([
    { $match: { tenantId: tenantObjId, soldAt: { $gte: lastWeekStart } } },
    {
      $group: {
        _id: { $cond: [{ $gte: ['$soldAt', thisWeekStart] }, 'current', 'previous'] },
        avgMargin: { $avg: { $divide: [{ $subtract: ['$unitPrice', '$unitCost'] }, '$unitPrice'] } },
      },
    },
  ]);
  const currentMargin  = marginRows.find((r) => r._id === 'current')?.avgMargin;
  const previousMargin = marginRows.find((r) => r._id === 'previous')?.avgMargin;
  if (currentMargin != null && previousMargin != null && previousMargin - currentMargin > 0.03) {
    alerts.push({
      type: 'warning',
      icon: 'alert-circle',
      message: `Tu margen promedio bajó ${((previousMargin - currentMargin) * 100).toFixed(1)} puntos esta semana`,
    });
  }

  return alerts;
}



async getPaymentBreakdown(tenantId, { range = 'day' } = {}) {
  const { from, to } = this._rangeToDates(range);
  const rows = await Sale.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), soldAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$paymentMethod', total: { $sum: '$total' } } },
  ]);
  const byMethod = Object.fromEntries(rows.map((r) => [r._id ?? 'cash', r.total]));
  return { cash: byMethod.cash ?? 0, card: byMethod.card ?? 0, transfer: byMethod.transfer ?? 0 };
}



async clearSales(tenantId, { scope, date } = {}) {
  const filter = { tenantId };
  if (scope === 'day' && date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    filter.soldAt = { $gte: start, $lte: end };
  } else if (scope === 'month' && date) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    filter.soldAt = { $gte: start, $lte: end };
  }
  const result = await Sale.updateMany(filter, { $set: { hiddenFromHistory: true } });
  return { archivedCount: result.modifiedCount };
}
}

export default new SaleService();