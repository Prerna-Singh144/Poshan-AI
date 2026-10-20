import Expert from '../models/Expert.js';
import ExpertAppointment from '../models/ExpertAppointment.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const list = asyncHandler(async (req, res) => {
  const {
    role,
    specialization,
    minExperience,
    minRating,
    maxFees,
    availableOn,
  } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (specialization) filter.specialization = { $regex: escapeRegex(specialization), $options: 'i' };
  if (minExperience !== undefined) filter.experienceYears = { $gte: Number(minExperience) };
  if (minRating !== undefined) filter.rating = { $gte: Number(minRating) };
  if (maxFees !== undefined) filter.fees = { $lte: Number(maxFees) };
  if (availableOn) {
    const start = new Date(`${availableOn}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.availability = { $elemMatch: { $gte: start, $lt: end } };
  }

  const experts = await Expert.find(filter)
    .select('name photoUrl role experienceYears specialization availability rating fees')
    .sort({ rating: -1, name: 1 })
    .lean();
  return res.json({
    success: true,
    data: {
      experts: experts.map(({ _id, ...expert }) => ({ id: _id, ...expert })),
      count: experts.length,
    },
  });
});

export const book = asyncHandler(async (req, res) => {
  const scheduledAt = new Date(req.body.scheduledAt);
  const expert = await Expert.findOne({ _id: req.body.expertId, availability: scheduledAt })
    .select('name role specialization fees availability');
  if (!expert) throw httpError(404, 'EXPERT_SLOT_NOT_FOUND', 'Expert or requested available slot was not found.');

  try {
    const appointment = await ExpertAppointment.create({
      userId: req.user.id,
      expertId: expert.id,
      scheduledAt,
    });
    return res.status(201).json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          expert: {
            id: expert.id,
            name: expert.name,
            role: expert.role,
            specialization: expert.specialization,
            fees: expert.fees,
          },
          scheduledAt: appointment.scheduledAt,
          status: appointment.status,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'EXPERT_SLOT_BOOKED', 'This expert slot has already been booked.');
    }
    throw error;
  }
});

export default { list, book };
