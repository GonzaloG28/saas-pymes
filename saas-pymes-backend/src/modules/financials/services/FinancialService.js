// modules/financials/services/FinancialService.js

import { FinancialTransaction, TRANSACTION_TYPES } from '../models/FinancialTransaction.js';
import { AppError } from '../../../core/errors/appError.js';

class FinancialService {

  // ── Registrar transacción ─────────────────────────────────────────────────

  /**
   * Crea una transacción inmutable en el ledger.
   * Valida que el monto sea positivo y que el tipo sea coherente.
   */
  async register(tenantId, userId, data) {
    const {
      amount, type, categoryId, categoryLabel,
      description, paymentMethod, note,
      referenceId, referenceModel, effectiveDate,
    } = data;

    if (Number(amount) <= 0)
      throw new AppError('El monto debe ser mayor a cero', 422, 'INVALID_AMOUNT');

    // ADJUSTMENT puede ser negativo — lo permitimos con signo explícito
    const finalAmount = type === TRANSACTION_TYPES.ADJUSTMENT
      ? Number(amount)   // el llamador controla el signo
      : Math.abs(Number(amount));

    const tx = FinancialTransaction.build({
      tenantId,
      amount: finalAmount,
      type,
      categoryId,
      categoryLabel,
      description,
      paymentMethod,
      note,
      referenceId,
      referenceModel,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      createdBy: userId,
    });

    await tx.save();
    return tx;
  }

  // ── Listar transacciones ──────────────────────────────────────────────────

  async list(tenantId, { type, from, to, paymentMethod, page = 1, limit = 30 } = {}) {
    const filter = { tenantId };
    if (type)          filter.type          = type;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (from || to) {
      filter.effectiveDate = {};
      if (from) filter.effectiveDate.$gte = new Date(from);
      if (to)   filter.effectiveDate.$lte = new Date(to);
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const safePage  = Math.max(1, parseInt(page, 10) || 1);

    const [transactions, total] = await Promise.all([
      FinancialTransaction
        .find(filter)
        .select('+encryptedAmount')
        .sort({ effectiveDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean({ virtuals: true }),
      FinancialTransaction.countDocuments(filter),
    ]);

    return {
      data:       transactions,
      total,
      page:       safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ── Balance actual ────────────────────────────────────────────────────────

  async getBalance(tenantId, { from, to } = {}) {
    return FinancialTransaction.getBalance(tenantId, { from, to });
  }

  // ── Resumen por categoría ─────────────────────────────────────────────────

  async getSummaryByCategory(tenantId, { from, to, type } = {}) {
    return FinancialTransaction.getSummaryByCategory(tenantId, { from, to, type });
  }

  // ── Serie temporal ────────────────────────────────────────────────────────

  async getTimeSeries(tenantId, { from, to, groupBy } = {}) {
    return FinancialTransaction.getTimeSeries(tenantId, { from, to, groupBy });
  }

  // ── Dashboard: balance + top categorías + serie — en una llamada ──────────

  /**
   * Agrega los tres reportes en paralelo para el dashboard principal.
   * Evita 3 llamadas HTTP separadas desde la app mobile.
   */
  async getDashboard(tenantId, { from, to } = {}) {
    const [balance, byCategory, timeSeries] = await Promise.all([
      this.getBalance(tenantId, { from, to }),
      this.getSummaryByCategory(tenantId, { from, to }),
      this.getTimeSeries(tenantId, { from, to, groupBy: 'day' }),
    ]);

    return { balance, byCategory, timeSeries };
  }
}

export default new FinancialService();
