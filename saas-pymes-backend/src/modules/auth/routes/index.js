import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate }  from '../../../core/middleware/validate.js';
import { authorize } from '../../../core/middleware/roles.js';
import * as AuthController from '../controllers/AuthController.js';

export const router   = Router();
export const basePath = '/auth';

const loginRules = [
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 8 }),
];

// Públicas
router.post('/login',   validate(loginRules), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/onboarding/verify', validate([query('token').notEmpty()]), AuthController.verifyOnboardingToken);
router.post('/onboarding/complete',
  validate([
    body('token').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('confirmPassword').custom((val, { req }) => val === req.body.newPassword),
  ]),
  AuthController.completeOnboarding
);

// Protegidas
router.post('/logout',  AuthController.logout);
router.get('/me',       AuthController.me);

router.post(
  '/users',
  authorize('owner'),
  validate([
    body('email').trim().notEmpty().isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 8 }),
    body('role').notEmpty().isIn(['admin', 'staff']),
  ]),
  AuthController.createUser
);