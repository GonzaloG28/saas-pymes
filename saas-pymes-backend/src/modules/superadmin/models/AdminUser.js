import mongoose from 'mongoose';
import bcrypt   from 'bcrypt';

const { Schema } = mongoose;

const adminUserSchema = new Schema(
  {
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
    },
    passwordHash: { type: String, required: true, select: false },
    name:     { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adminUserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

adminUserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminUserSchema.methods.toSafeObject = function () {
  return { id: this._id, email: this.email, name: this.name };
};

export default mongoose.model('AdminUser', adminUserSchema);