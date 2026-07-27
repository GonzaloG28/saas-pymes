// modules/products/services/ProductService.js

import Product      from '../models/Product.js';
import { encrypt }  from '../../../shared/encryption/fieldEncryption.js';
import { AppError } from '../../../core/errors/appError.js';
import TenantService from '../../tenants/services/TenantService.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

class ProductService {

  async list(tenantId, { page = 1, limit = DEFAULT_LIMIT, activeOnly = true, search } = {}) {
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));

  const filter = { tenantId };
  if (activeOnly) filter.isActive = true;
  if (search) {
    const rx = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }

  const [products, total] = await Promise.all([
  Product
    .find(filter)
    .select('+encryptedCost +encryptedPrice')
    .sort({ name: 1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit),
  // ← sin .lean()
  Product.countDocuments(filter),
]);

return {
  data: products.map((p) => p.toSafeObject()), // ← serializar aquí
  total,
  page:       safePage,
  totalPages: Math.ceil(total / safeLimit),
};
}

  async getById(tenantId, productId) {
    const product = await Product
      .findOne({ _id: productId, tenantId })
      .select('+encryptedCost +encryptedPrice');

    if (!product) throw new AppError('Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    return product;
  }

  async create(tenantId, userId, data) {
    const { sku, name, cost, price, unit, description, categoryId } = data;

    if (await Product.exists({ tenantId, sku: sku.toUpperCase() }))
      throw new AppError(`Ya existe un producto con SKU "${sku}"`, 409, 'DUPLICATE_SKU');

    if (Number(price) < Number(cost))
      throw new AppError('El precio no puede ser menor al costo', 422, 'INVALID_MARGIN');
    
    await TenantService.checkProductQuota(tenantId);
    
      if (await Product.exists({ tenantId, sku: sku.toUpperCase() }))
        throw new AppError(`Ya existe un producto con SKU "${sku}"`, 409, 'DUPLICATE_SKU');

    const product = Product.build({ tenantId, sku, name, cost, price, unit, description, categoryId, audit: { createdBy: userId } });
    await product.save();
    return product;
  }

  async update(tenantId, productId, userId, data) {
    const product = await this.getById(tenantId, productId);
    const { name, cost, price, unit, description, categoryId } = data;

    if (name        != null) product.name        = name;
    if (unit        != null) product.unit        = unit;
    if (description != null) product.description = description;
    if (categoryId  != null) product.categoryId  = categoryId;
    if (cost        != null) product.encryptedCost  = encrypt(cost);
    if (price       != null) product.encryptedPrice = encrypt(price);

    const finalCost  = cost  != null ? Number(cost)  : product.cost;
    const finalPrice = price != null ? Number(price) : product.price;
    if (finalPrice < finalCost)
      throw new AppError('El precio no puede ser menor al costo', 422, 'INVALID_MARGIN');

    product.audit = { ...product.audit?.toObject?.(), updatedBy: userId };
    await product.save();
    return product;
  }

  async softDelete(tenantId, productId, userId) {
    const product = await this.getById(tenantId, productId);
    if (!product.isActive) throw new AppError('El producto ya está desactivado', 409, 'ALREADY_INACTIVE');

    product.isActive = false;
    product.audit    = { ...product.audit?.toObject?.(), updatedBy: userId };
    await product.save();
    return { message: 'Producto desactivado' };
  }
}

export default new ProductService();
