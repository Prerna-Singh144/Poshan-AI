import mongoose from 'mongoose';

const expertAppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['booked', 'cancelled'], default: 'booked', required: true },
}, { timestamps: true, versionKey: false });

expertAppointmentSchema.index({ expertId: 1, scheduledAt: 1 }, { unique: true });
expertAppointmentSchema.index({ userId: 1, scheduledAt: 1 });

const ExpertAppointment = mongoose.models.ExpertAppointment
  ?? mongoose.model('ExpertAppointment', expertAppointmentSchema);
export default ExpertAppointment;
