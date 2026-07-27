import mongoose from 'mongoose';
const { Schema } = mongoose;

export const REPORT_TYPES = Object.freeze({ BUG: 'bug', SUGGESTION: 'suggestion', OTHER: 'other' });
export const REPORT_STATUS = Object.freeze({ OPEN: 'open', IN_REVIEW: 'in_review', RESOLVED: 'resolved', DISMISSED: 'dismissed' });

const bugReportSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    type:     { type: String, enum: Object.values(REPORT_TYPES), default: REPORT_TYPES.BUG },
    title:    { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    appVersion:  { type: String, required: true, trim: true },  // ej: "1.4.2"
    platform:    { type: String, enum: ['ios', 'android', 'web'], required: true },
    screenContext: { type: String, trim: true }, // ej: "products/[id]" — desde qué pantalla se reportó
    status:   { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.OPEN, index: true },
    adminNote: { type: String, trim: true, maxlength: 1000 }, // respuesta interna del superadmin
  },
  { timestamps: true }
);

bugReportSchema.index({ status: 1, createdAt: -1 });
bugReportSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('BugReport', bugReportSchema);