import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['retest_reminder'], required: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ userId: 1, type: 1, reportId: 1 }, { unique: true });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);
export default Notification;
