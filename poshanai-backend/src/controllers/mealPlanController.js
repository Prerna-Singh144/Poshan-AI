import MealPlan from '../models/MealPlan.js';
import { env } from '../config/env.js';
import { generateMealPlan, getMedicalDisclaimer } from '../services/aiService.js';
import logger from '../utils/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import { enqueueMealPlanGeneration, getMealPlanJob } from '../jobs/mealPlanQueue.js';

function publicMealPlan(mealPlan) {
  const plan = mealPlan.toObject();
  return { ...plan, disclaimer: plan.disclaimer ?? getMedicalDisclaimer() };
}

export const generate = asyncHandler(async (req, res) => {
  // Integration tests exercise generation without requiring a Redis queue or worker.
  if (env.nodeEnv === 'test') {
    const mealPlan = await generateMealPlan(req.user._id, req.body.reportId, req.body.preferences);
    return res.status(201).json({ success: true, data: publicMealPlan(mealPlan) });
  }

  try {
    const jobId = await enqueueMealPlanGeneration({
      userId: req.user._id,
      reportId: req.body.reportId,
      preferences: req.body.preferences,
    });
    return res.status(202).json({ success: true, data: { jobId, status: 'queued' } });
  } catch (error) {
    if (error.code === 'MEAL_PLAN_QUEUE_UNAVAILABLE' || error.code === 'REDIS_NOT_CONFIGURED') {
      throw httpError(503, 'MEAL_PLAN_QUEUE_UNAVAILABLE', 'Meal-plan generation is temporarily unavailable. Please try again later.');
    }
    throw error;
  }
});

export const getGenerationStatus = asyncHandler(async (req, res) => {
  const job = await getMealPlanJob(req.params.jobId);
  if (!job || String(job.data?.userId) !== String(req.user._id)) {
    throw httpError(404, 'MEAL_PLAN_JOB_NOT_FOUND', 'Meal-plan generation job not found.');
  }
  const state = await job.getState();
  const payload = {
    jobId: job.id,
    status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : state,
    ...(state === 'completed' ? { planId: job.returnvalue?.planId } : {}),
    ...(state === 'failed' ? { message: 'Meal-plan generation failed. Please try again.' } : {}),
  };
  return res.json({ success: true, data: payload });
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.pagination;
  const filter = { userId: req.user._id };
  const [mealPlans, total] = await Promise.all([
    MealPlan.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MealPlan.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: {
      mealPlans: mealPlans.map(publicMealPlan),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

export const getById = asyncHandler(async (req, res) => {
  const mealPlan = await MealPlan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!mealPlan) throw httpError(404, 'MEAL_PLAN_NOT_FOUND', 'Meal plan not found.');
  return res.json({ success: true, data: publicMealPlan(mealPlan) });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const mealPlan = await MealPlan.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status: req.body.status } },
    { new: true, runValidators: true },
  );
  if (!mealPlan) throw httpError(404, 'MEAL_PLAN_NOT_FOUND', 'Meal plan not found.');
  logger.info('Meal-plan status updated.');
  return res.json({ success: true, data: publicMealPlan(mealPlan) });
});

export default { generate, getGenerationStatus, list, getById, updateStatus };
