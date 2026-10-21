import { z } from 'zod';
import {
  ACTIVITY_OPTIONS, DIET_OPTIONS, HABIT_OPTIONS, SLEEP_TIME_OPTIONS, SUN_OPTIONS, SYMPTOM_OPTIONS,
} from '../components/lifestyle/options.js';

const values = (options) => options.map((option) => option.value);
const choice = (options, message) =>
  z.enum(values(options), { errorMap: () => ({ message }) });
const multi = (options, message) =>
  z.array(z.enum(values(options))).min(1, message);

export const INITIAL_LIFESTYLE_VALUES = {
  dietType: '',
  mealsPerDay: 3,
  typicalDiet: [],
  sleepHours: 7,
  sleepTime: '',
  sunExposure: '',
  activityLevel: '',
  habits: [],
  symptoms: [],
  consent: false,
};

export const stepSchemas = [
  z.object({
    consent: z.literal(true, { errorMap: () => ({ message: 'Please agree to continue.' }) }),
  }),
  z.object({
    dietType: choice(DIET_OPTIONS, 'Please choose your diet type.'),
    mealsPerDay: z.number().int().min(1).max(10),
    typicalDiet: z.array(z.string().min(1).max(40)).max(30),
  }),
  z.object({
    sleepHours: z.number().min(1).max(16),
    sleepTime: choice(SLEEP_TIME_OPTIONS, 'Please choose when you usually sleep.'),
    sunExposure: choice(SUN_OPTIONS, 'Please choose how much sunlight you get.'),
    activityLevel: choice(ACTIVITY_OPTIONS, 'Please choose your activity level.'),
  }),
  z.object({
    symptoms: multi(SYMPTOM_OPTIONS, 'Select at least one option, or "None of these".'),
    habits: multi(HABIT_OPTIONS, 'Select at least one option, or "None of these".'),
  }),
];

export const onboardingSchema = stepSchemas.reduce(
  (schema, stepSchema) => schema.merge(stepSchema),
  z.object({}),
);

export const STEP_FIELDS = [
  ['consent'],
  ['dietType', 'mealsPerDay', 'typicalDiet'],
  ['sleepHours', 'sleepTime', 'sunExposure', 'activityLevel'],
  ['symptoms', 'habits'],
];

/** @returns {{ ok: boolean, errors: Record<string, string> }} */
export function validateStep(stepIndex, currentValues) {
  const result = stepSchemas[stepIndex].safeParse(currentValues);
  if (result.success) return { ok: true, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    errors[issue.path[0]] ??= issue.message;
  }
  return { ok: false, errors };
}

export function buildOnboardingPayload(v) {
  return {
    dietType: v.dietType,
    mealsPerDay: v.mealsPerDay,
    typicalDiet: v.typicalDiet,
    sleepHours: v.sleepHours,
    sleepTime: v.sleepTime,
    sunExposure: v.sunExposure,
    activityLevel: v.activityLevel,
    habits: v.habits,
    symptoms: v.symptoms,
    consent: true,
  };
}
