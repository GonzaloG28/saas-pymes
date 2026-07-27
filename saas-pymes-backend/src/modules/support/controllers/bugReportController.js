import BugReport from '../models/BugReport.js';
import Tenant from '../../tenants/models/Tenant.js';
import { sendBugReportNotification } from '../../../shared/email/emailService.js';

export const create = async (req, res, next) => {
  try {
    const { type, title, description, appVersion, platform, screenContext } = req.body;
    const report = await BugReport.create({
      tenantId: req.tenantId,
      userId:   req.userId,
      type, title, description, appVersion, platform, screenContext,
    });

    // Envío en segundo plano — no bloquea la respuesta al usuario
    Tenant.findById(req.tenantId).then((tenant) => {
      sendBugReportNotification(report, tenant);
    });

    res.status(201).json({ data: report });
  } catch (err) { next(err); }
};