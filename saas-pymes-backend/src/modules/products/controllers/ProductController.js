// modules/products/controllers/ProductController.js

import ProductService from '../services/ProductService.js';

const async_ = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const serialize = (p) =>{
  if (typeof p.toSafeObject === 'function') return p.toSafeObject();
  return {
    id:            p._id,
    tenantId:      p.tenantId,
    sku:           p.sku,
    name:          p.name,
    description:   p.description,
    unit:          p.unit,
    categoryId:    p.categoryId,
    cost:          p.cost,            
    price:         p.price,           
    grossMarginPct: p.grossMarginPct, 
    isActive:      p.isActive,
    createdAt:     p.createdAt,
    updatedAt:     p.updatedAt,
  };
}

export const list = async_(async (req, res) => {
  const { page, limit, search, activeOnly } = req.query;
  const result = await ProductService.list(req.tenantId, {
    page, limit, search, activeOnly: activeOnly !== 'false',
  });
  // result.data ya son objetos planos con cost, price y grossMarginPct
  res.json({
    status: 'ok',
    data:   result.data,
    meta:   { total: result.total, page: result.page, totalPages: result.totalPages },
  });
});

export const getById = async_( async (req, res) => {
  const product = await ProductService.getById(req.tenantId, req.params.id);
  res.json({ status: 'ok', data: serialize(product) });
});

export const create = async_( async (req, res) => {
  const product = await ProductService.create(req.tenantId, req.userId, req.body);
  res.status(201).json({ status: 'ok', message: 'Producto creado', data: serialize(product) });
});

export const update = async_( async (req, res) => {
  const product = await ProductService.update(req.tenantId, req.params.id, req.userId, req.body);
  res.json({ status: 'ok', message: 'Producto actualizado', data: serialize(product) });
});

export const softDelete = async_( async (req, res) => {
  const result = await ProductService.softDelete(req.tenantId, req.params.id, req.userId);
  res.json({ status: 'ok', ...result });
});
