import crypto from 'crypto';
import TenantService from '../../tenants/services/TenantService.js';
import OnboardingToken from '../../auth/models/OnboardingToken.js';
import { AppError } from '../../../core/errors/appError.js';

class SuperAdminService {
  // Reemplaza al POST /tenants/register público
  async createTenantWithOwner({ companyName, contactEmail, contactPhone, country }) {
    // Generamos una contraseña temporal aleatoria — el owner NUNCA la usa realmente,
    // solo sirve para satisfacer el required del schema hasta que la cambie.
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const { tenant, owner } = await TenantService.register({
      companyName, contactEmail, contactPhone, country,
      ownerPassword: tempPassword,
    });

    // owner.mustChangePassword ya es true por default del schema
    const rawToken = await OnboardingToken.issue(tenant._id, owner._id, 72); // válido 72h

    // Aquí se dispara el email/SMS con el link/código — usando tu proveedor (SendGrid, etc.)
    // El link apunta a algo como: myapp://onboarding?token=<rawToken>&tenantId=<tenant._id>
    return { tenant, owner, onboardingToken: rawToken };
  }
}

export default new SuperAdminService();