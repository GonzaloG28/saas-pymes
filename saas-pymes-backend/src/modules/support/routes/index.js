import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../core/middleware/validate.js';
import * as bugReportController from '../controllers/bugReportController.js';

const router = Router();

// tenantResolver ya se aplica globalmente en app.js antes del moduleLoader

router.post(
  '/bug-reports',
  validate([
    body('type').optional().isIn(['bug', 'suggestion', 'other']),
    body('title').trim().notEmpty().isLength({ max: 150 }),
    body('description').trim().notEmpty().isLength({ max: 2000 }),
    body('appVersion').trim().notEmpty(),
    body('platform').isIn(['ios', 'android', 'web']),
    body('screenContext').optional().trim(),
  ]),
  bugReportController.create
);

export const basePath = '/support';
export { router };