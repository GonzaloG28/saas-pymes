import superAdminAuthService from '../services/superAdminAuthService.js';
import superAdminService      from '../services/superAdminService.js';
import BugReport from '../../support/models/BugReport.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { admin, accessToken } = await superAdminAuthService.login(email, password);
    res.json({ data: { admin: admin.toSafeObject(), accessToken } });
  } catch (err) { next(err); }
};

export const createTenant = async (req, res, next) => {
  try {
    const result = await superAdminService.createTenantWithOwner(req.body);
    res.status(201).json({
      data: {
        tenant: result.tenant.toSafeObject(),
        owner:  result.owner.toSafeObject(),
        onboardingToken: result.onboardingToken, // mientras no tengas email configurado, lo devolvés acá
      },
    });
  } catch (err) { next(err); }
};

export const listBugReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const reports = await BugReport.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('tenantId', 'name slug')
      .populate('userId', 'email');
    res.json({ data: reports });
  } catch (err) { next(err); }
};

export const updateBugReport = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const report = await BugReport.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(adminNote && { adminNote }) },
      { new: true }
    );
    res.json({ data: report });
  } catch (err) { next(err); }
};