import { Router } from 'express';
import { body } from 'express-validator';
import { requireSuperAdmin } from '../../../core/middleware/superAdminAuth.js';
import { validate } from '../../../core/middleware/validate.js';
import * as superAdminController from '../controllers/superAdminController.js';

const router = Router();

// Login — público, es el único endpoint sin requireSuperAdmin
router.post(
  '/login',
  validate([body('email').isEmail(), body('password').notEmpty()]),
  superAdminController.login
);

router.use(requireSuperAdmin);

router.post(
  '/tenants',
  validate([
    body('companyName').trim().notEmpty().isLength({ min: 2, max: 120 }),
    body('contactEmail').trim().isEmail(),
    body('country').optional().trim().isLength({ min: 2, max: 2 }),
  ]),
  superAdminController.createTenant
);

router.get('/bug-reports', superAdminController.listBugReports);
router.patch('/bug-reports/:id', superAdminController.updateBugReport);

export const basePath = '/superadmin';
export { router };