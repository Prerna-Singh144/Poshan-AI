import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Salad } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { generateBasicDietPlan } from '../api/dietPlanApi.js';
import { getApiError } from '../api/client.js';

const wizardSchema = z.object({
  age: z.coerce.number().int().min(18, 'Basic plans are currently for adults aged 18 or older.').max(100),
  gender: z.enum(['female', 'male', 'other'], { required_error: 'Choose an option.' }),
  weightKg: z.coerce.number().min(30, 'Enter a weight of at least 30 kg.').max(300),
  heightCm: z.coerce.number().min(120, 'Enter a height of at least 120 cm.').max(250),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  dietType: z.enum(['veg', 'nonveg', 'vegan']),
  mealsPerDay: z.coerce.number().int().min(1).max(5),
  dislikes: z.array(z.string().max(80)).max(50),
  conditions: z.object({
    diabetes: z.boolean(),
    kidneyDisease: z.boolean(),
    pregnancy: z.boolean(),
  }),
});

const foodOptions = ['Roti', 'Rice', 'Paneer', 'Eggs', 'Milk', 'Peanuts', 'Wheat', 'Soy', 'Fish'];
const conditionOptions = [
  { name: 'conditions.diabetes', label: 'Diabetes' },
  { name: 'conditions.kidneyDisease', label: 'Kidney disease' },
  { name: 'conditions.pregnancy', label: 'Pregnancy' },
];

const steps = [
  { title: 'Your health', description: 'A few basics help us estimate your daily needs.' },
  { title: 'Your preferences', description: 'Shape the plan around the foods you enjoy.' },
  { title: 'A quick safety check', description: 'Make sure a general plan is appropriate for you.' },
];

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-rose-600">{children}</p> : null;
}

export default function DietPlanWizard() {
  const [step, setStep] = useState(0);
  const [requestError, setRequestError] = useState('');
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      age: '',
      gender: '',
      weightKg: '',
      heightCm: '',
      activityLevel: 'moderate',
      goal: 'maintain',
      dietType: 'veg',
      mealsPerDay: 3,
      dislikes: [],
      conditions: { diabetes: false, kidneyDisease: false, pregnancy: false },
    },
  });
  const selectedConditions = useWatch({ control, name: 'conditions' });
  const hasSafetyCondition = Object.values(selectedConditions ?? {}).some(Boolean);

  async function continueWizard() {
    const fieldsByStep = [
      ['age', 'gender', 'weightKg', 'heightCm', 'activityLevel', 'goal'],
      ['dietType', 'mealsPerDay', 'dislikes'],
    ];
    const valid = await trigger(fieldsByStep[step], { shouldFocus: true });
    if (valid) {
      setRequestError('');
      setStep((current) => current + 1);
    }
  }

  async function submitPlan(values) {
    if (hasSafetyCondition) return;
    setRequestError('');
    try {
      const request = {
        age: values.age,
        gender: values.gender,
        weightKg: values.weightKg,
        heightCm: values.heightCm,
        activityLevel: values.activityLevel,
        goal: values.goal,
        dietType: values.dietType,
        mealsPerDay: values.mealsPerDay,
        dislikes: values.dislikes,
      };
      const plan = await generateBasicDietPlan(request);
      navigate('/diet-plan/view', { replace: true, state: { plan } });
    } catch (error) {
      setRequestError(getApiError(error) || 'We could not create your plan. Please try again.');
    }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';
  const labelClass = 'block text-sm font-semibold text-slate-700';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3 text-sm font-semibold text-emerald-800">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100"><Salad size={20} /></span>
          Basic diet plan
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Build a plan that fits your day</h1>
        <p className="mt-2 max-w-2xl text-slate-600">A practical starting point based on your routine and food preferences.</p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2" aria-label={`Step ${step + 1} of 3`}>
        {steps.map((item, index) => (
          <div key={item.title} className={`h-1.5 rounded-full ${index <= step ? 'bg-emerald-700' : 'bg-emerald-100'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit(submitPlan)} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_20px_70px_-40px_rgba(31,86,49,0.35)] sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Step {step + 1} of 3</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{steps[step].title}</h2>
          <p className="mt-1 text-slate-600">{steps[step].description}</p>
        </div>

        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Age <span className="text-slate-400">(18+)</span>
              <input {...register('age')} type="number" min="18" max="100" className={inputClass} placeholder="e.g. 28" />
              <FieldError>{errors.age?.message}</FieldError>
            </label>
            <label className={labelClass}>Gender used for calorie estimate
              <select {...register('gender')} className={inputClass}>
                <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
              <FieldError>{errors.gender?.message}</FieldError>
            </label>
            <label className={labelClass}>Weight (kg)
              <input {...register('weightKg')} type="number" min="30" max="300" step="0.1" className={inputClass} placeholder="e.g. 68" />
              <FieldError>{errors.weightKg?.message}</FieldError>
            </label>
            <label className={labelClass}>Height (cm)
              <input {...register('heightCm')} type="number" min="120" max="250" step="0.1" className={inputClass} placeholder="e.g. 170" />
              <FieldError>{errors.heightCm?.message}</FieldError>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>Activity level
              <select {...register('activityLevel')} className={inputClass}>
                <option value="sedentary">Mostly sitting</option><option value="light">Light activity</option><option value="moderate">Moderately active</option><option value="active">Very active</option><option value="very_active">Highly active</option>
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className={labelClass}>What is your current goal?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { value: 'lose', title: 'Lose weight', copy: 'A modest calorie deficit' },
                  { value: 'maintain', title: 'Maintain', copy: 'Support your current routine' },
                  { value: 'gain', title: 'Gain weight', copy: 'A modest calorie surplus' },
                ].map((goal) => (
                  <label key={goal.value} className="cursor-pointer">
                    <input {...register('goal')} type="radio" value={goal.value} className="peer sr-only" />
                    <span className="block h-full rounded-2xl border border-slate-200 p-4 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500">
                      <span className="block font-semibold text-slate-900">{goal.title}</span><span className="mt-1 block text-sm text-slate-500">{goal.copy}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-7">
            <fieldset>
              <legend className={labelClass}>Choose your diet style</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { value: 'veg', title: 'Vegetarian', copy: 'Plant-based and dairy' },
                  { value: 'nonveg', title: 'Includes non-veg', copy: 'No food group excluded' },
                  { value: 'vegan', title: 'Vegan', copy: 'Plant-based foods' },
                ].map((diet) => (
                  <label key={diet.value} className="cursor-pointer">
                    <input {...register('dietType')} type="radio" value={diet.value} className="peer sr-only" />
                    <span className="block rounded-2xl border border-slate-200 p-4 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500">
                      <span className="block font-semibold text-slate-900">{diet.title}</span><span className="mt-1 block text-sm text-slate-500">{diet.copy}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={labelClass}>Meals per day
              <select {...register('mealsPerDay')} className={inputClass}>
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'meal' : 'meals'}</option>)}
              </select>
            </label>

            <fieldset>
              <legend className={labelClass}>Foods to avoid <span className="font-normal text-slate-400">(optional)</span></legend>
              <p className="mt-1 text-sm text-slate-500">Select any foods you would rather leave out.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {foodOptions.map((food) => (
                  <label key={food} className="cursor-pointer">
                    <input {...register('dislikes')} type="checkbox" value={food} className="peer sr-only" />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 transition peer-checked:border-emerald-700 peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500">
                      <Check size={14} className="hidden peer-checked:inline" />{food}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm leading-6 text-slate-600">A general meal plan may not be suitable for every health condition. Please tell us if any of these apply.</p>
            <div className="mt-5 space-y-3">
              {conditionOptions.map((condition) => (
                <label key={condition.name} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                  <input {...register(condition.name)} type="checkbox" className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500" />
                  <span className="font-medium text-slate-800">{condition.label}</span>
                </label>
              ))}
            </div>
            {hasSafetyCondition && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} />
                <div><p className="font-semibold">Please consult your doctor or a registered dietitian.</p><p className="mt-1 text-sm">A general plan may not meet your medical needs. Plan generation is paused for your safety.</p></div>
              </div>
            )}
            <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">This plan is for general nutrition awareness. It does not diagnose, treat, or replace advice from a qualified healthcare professional.</p>
          </div>
        )}

        {requestError && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{requestError}</p>}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((current) => current - 1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={17} /> Back</button>
          ) : <span />}
          {step < 2 ? (
            <button type="button" onClick={continueWizard} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-900">Next <ArrowRight size={17} /></button>
          ) : (
            <button type="submit" disabled={isSubmitting || hasSafetyCondition} className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isSubmitting ? 'Creating your plan…' : 'Create my plan'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
