// modules/tenants/services/TenantService.js

import mongoose        from 'mongoose';
import Tenant, { TENANT_STATUS, PLAN_LIMITS } from '../models/Tenant.js';
import { AppError }    from '../../../core/errors/appError.js';

// User se importa dinámicamente para evitar dependencia circular
// (User referencia tenantId, Tenant no referencia User en el schema)
const getUser = async () => (await import('../../auth/models/User.js')).default;

class TenantService {

  // ── REGISTRO ──────────────────────────────────────────────────────────────
  /**
   * Flujo completo de alta de empresa:
   *  1. Generar slug único a partir del nombre
   *  2. Crear el Tenant
   *  3. Crear el usuario owner asociado
   *  4. Todo en una transacción MongoDB → si falla uno, se revierte todo
   *
   * @returns {{ tenant, owner }}
   */
  async register({ companyName, contactEmail, contactPhone, country, ownerPassword }) {
    const User = await getUser();

    // Verificar que el email no esté ya registrado como owner en otro tenant
    const emailExists = await User.exists({ email: contactEmail.toLowerCase().trim() });
    if (emailExists)
      throw new AppError(
        'Ya existe una cuenta con ese email.',
        409,
        'EMAIL_ALREADY_EXISTS'
      );

    const slug = await this._generateUniqueSlug(companyName);

    // Transacción: Tenant + User owner se crean juntos o no se crea ninguno
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Crear tenant
      const [tenant] = await Tenant.create(
        [{ name: companyName, slug, contactEmail, contactPhone, country }],
        { session }
      );

      // 2. Crear usuario owner
      const [owner] = await User.create(
        [{
          tenantId:     tenant._id,
          email:        contactEmail,
          passwordHash: ownerPassword,  // pre('save') hashea automáticamente
          role:         'owner',
        }],
        { session }
      );

      await session.commitTransaction();
      return { tenant, owner };

    } catch (err) {
      await session.abortTransaction();
      // Re-lanzar como AppError si es duplicate key de Mongoose
      if (err.code === 11000)
        throw new AppError('El nombre de empresa ya está registrado.', 409, 'DUPLICATE_TENANT');
      throw err;
    } finally {
      await session.endSession();
    }
  }

  // ── CONSULTA ──────────────────────────────────────────────────────────────

  async getById(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new AppError('Empresa no encontrada', 404, 'TENANT_NOT_FOUND');
    return tenant;
  }

  async getBySlug(slug) {
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (!tenant) throw new AppError('Empresa no encontrada', 404, 'TENANT_NOT_FOUND');
    return tenant;
  }

  // ── ACTUALIZACIÓN (solo owner) ─────────────────────────────────────────────

  async update(tenantId, data) {
    const tenant = await this.getById(tenantId);
    const { name, contactPhone, country } = data;

    if (name         != null) tenant.name         = name;
    if (contactPhone != null) tenant.contactPhone = contactPhone;
    if (country      != null) tenant.country      = country;

    await tenant.save();
    return tenant;
  }

  // ── VERIFICACIÓN DE CUOTAS ────────────────────────────────────────────────
  /**
   * Verifica que el tenant no haya superado el límite de productos de su plan.
   * Llamado desde ProductService.create() antes de crear un producto.
   */
  async checkProductQuota(tenantId) {
    const Product = (await import('../../products/models/Product.js')).default;
    const tenant  = await this.getById(tenantId);
    const limits  = tenant.getLimits();
    const count   = await Product.countDocuments({ tenantId, isActive: true });

    if (count >= limits.maxProducts)
      throw new AppError(
        `Límite de productos alcanzado para el plan ${tenant.plan} (máx. ${limits.maxProducts}). Actualiza tu plan.`,
        403,
        'QUOTA_EXCEEDED'
      );
  }

  /**
   * Verifica que el tenant no haya superado el límite de usuarios.
   * Llamado desde AuthController.createUser() antes de crear un usuario.
   */
  async checkUserQuota(tenantId) {
    const User   = await getUser();
    const tenant = await this.getById(tenantId);
    const limits = tenant.getLimits();
    const count  = await User.countDocuments({ tenantId, isActive: true });

    if (count >= limits.maxUsersPerTenant)
      throw new AppError(
        `Límite de usuarios alcanzado para el plan ${tenant.plan} (máx. ${limits.maxUsersPerTenant}).`,
        403,
        'QUOTA_EXCEEDED'
      );
  }

  // ── PRIVADOS ──────────────────────────────────────────────────────────────

  /**
   * Genera un slug URL-safe único a partir del nombre de empresa.
   * Si "Mi Empresa" ya existe, intenta "mi-empresa-2", "mi-empresa-3", etc.
   */
  async _generateUniqueSlug(name) {
    const base = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // eliminar tildes
      .replace(/[^a-z0-9\s\-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);

    let slug    = base;
    let attempt = 1;

    while (await Tenant.exists({ slug })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }
}

export default new TenantService();
