import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// Keep RetroUI components scoped to onboarding and authentication flows.
import { Button as RetroButton } from 'pixel-retroui';
import '../components/ui/threeui/threeui.css';

const WarpFieldBackground = lazy(() => import('../components/ui/threeui/WarpFieldBackground.jsx'));
import { getApiError } from '../api/client.js';
import { submitOnboarding } from '../api/lifestyleApi.js';
import { Card, useToast } from '../components/common/index.js';
import OnboardingProgress from '../components/lifestyle/OnboardingProgress.jsx';
import {
  ChipGroup, ChoiceGrid, ConsentCheckbox, RangeField, Stepper,
} from '../components/lifestyle/OptionControls.jsx';
import {
  ACTIVITY_OPTIONS, DIET_OPTIONS, HABIT_OPTIONS, SLEEP_TIME_OPTIONS, STEP_TITLES,
  SUN_OPTIONS, SYMPTOM_OPTIONS, TYPICAL_DIET_OPTIONS,
} from '../components/lifestyle/options.js';
import {
  INITIAL_LIFESTYLE_VALUES, buildOnboardingPayload, validateStep,
} from '../utils/lifestyleSchemas.js';

const TOTAL_STEPS = STEP_TITLES.length;

// "None" cannot be combined with other answers (the API enforces the same rule).
function toggleExclusive(list, value) {
  if (value === 'none') return list.includes('none') ? [] : ['none'];
  const withoutNone = list.filter((item) => item !== 'none');
  return withoutNone.includes(value)
    ? withoutNone.filter((item) => item !== value)
    : [...withoutNone, value];
}

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [{ step, direction }, setPosition] = useState({ step: 0, direction: 1 });
  const [values, setValues] = useState(INITIAL_LIFESTYLE_VALUES);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef(null);
  const headingRef = useRef(null);
  const hasMoved = useRef(false);

  // After a step change, bring the card into view and move focus to its heading.
  useEffect(() => {
    if (!hasMoved.current) {
      hasMoved.current = true;
      return;
    }
    cardRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, reduceMotion]);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const goTo = (nextStep) => setPosition(({ step: from }) => ({ step: nextStep, direction: nextStep > from ? 1 : -1 }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = validateStep(step, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      goTo(step + 1);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitOnboarding(buildOnboardingPayload(values));
      toast('Your answers are saved.', 'success');
      navigate('/recommendations');
    } catch (error) {
      if (error.apiError?.code === 'CONSENT_REQUIRED') setErrors({ consent: 'Please agree to continue.' });
      else toast(getApiError(error), 'error');
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (dir) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -36 }),
  };

  return (
    <>
    <div className="auth-warp-background fixed inset-x-0 bottom-0 top-16 z-0" aria-hidden="true">
      <Suspense fallback={null}><WarpFieldBackground variant="keycaps" speed={0.45} streakOpacity={0.18} tileOpacity={0.45} fov={75} hue={0} saturation={1.2} brightness={0.75} /></Suspense>
    </div>
    <div className="font-minecraft relative z-10 mx-auto w-full max-w-2xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Tell us about your routine</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          A few quick questions help us suggest blood tests worth discussing with your doctor.
        </p>
      </header>

      <Card ref={cardRef} padding="none" className="scroll-mt-20 overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-4 sm:p-6">
            <OnboardingProgress step={step} total={TOTAL_STEPS} title={STEP_TITLES[step]} />
          </div>

          <div className="overflow-x-clip px-4 pb-6 sm:px-6">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduceMotion ? 0.15 : 0.26, ease: 'easeOut' }}
                className="space-y-6"
              >
                <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-900 outline-none dark:text-white">
                  {STEP_TITLES[step]}
                </h2>
                {step === 0 && (
                  <>
                    <ChoiceGrid legend="What is your diet type?" name="dietType" options={DIET_OPTIONS} value={values.dietType} onChange={(v) => setField('dietType', v)} error={errors.dietType} />
                    <Stepper legend="Meals per day" unit="meals" min={1} max={10} value={values.mealsPerDay} onChange={(v) => setField('mealsPerDay', v)} />
                    <ChipGroup legend="What do you usually eat?" hint="Pick any that apply." options={TYPICAL_DIET_OPTIONS} selected={values.typicalDiet} onToggle={(v) => setField('typicalDiet', values.typicalDiet.includes(v) ? values.typicalDiet.filter((i) => i !== v) : [...values.typicalDiet, v])} error={errors.typicalDiet} />
                  </>
                )}
                {step === 1 && (
                  <>
                    <RangeField legend="Hours of sleep" unit="hrs" min={3} max={12} step={0.5} value={values.sleepHours} onChange={(v) => setField('sleepHours', v)} />
                    <ChoiceGrid legend="When do you usually sleep?" name="sleepTime" options={SLEEP_TIME_OPTIONS} value={values.sleepTime} onChange={(v) => setField('sleepTime', v)} error={errors.sleepTime} />
                    <ChoiceGrid legend="How much sunlight do you get?" name="sunExposure" options={SUN_OPTIONS} value={values.sunExposure} onChange={(v) => setField('sunExposure', v)} error={errors.sunExposure} />
                  </>
                )}
                {step === 2 && (
                  <>
                    <ChoiceGrid legend="How active are you?" name="activityLevel" options={ACTIVITY_OPTIONS} value={values.activityLevel} onChange={(v) => setField('activityLevel', v)} error={errors.activityLevel} />
                    <ChipGroup legend="Do you have any of these habits?" options={HABIT_OPTIONS} selected={values.habits} onToggle={(v) => setField('habits', toggleExclusive(values.habits, v))} error={errors.habits} />
                  </>
                )}
                {step === 3 && (
                  <>
                    <ChipGroup legend="Have you noticed any of these recently?" options={SYMPTOM_OPTIONS} selected={values.symptoms} onToggle={(v) => setField('symptoms', toggleExclusive(values.symptoms, v))} error={errors.symptoms} />
                    <ConsentCheckbox checked={values.consent} onChange={(v) => setField('consent', v)} error={errors.consent} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
            {step > 0 && (
              <RetroButton
                type="button"
                bg="#1E5631"
                textColor="#FFFFFF"
                borderColor="#000000"
                shadow="#000000"
                className="mx-0 my-0 flex-1 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
                onClick={() => goTo(step - 1)}
                disabled={isSubmitting}
              >
                Back
              </RetroButton>
            )}
            <RetroButton
              type="submit"
              bg="#1E5631"
              textColor="#FFFFFF"
              borderColor="#000000"
              shadow="#000000"
              className="mx-0 my-0 flex-1 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {step === TOTAL_STEPS - 1 ? 'See my tests' : 'Next'}
            </RetroButton>
          </div>
        </form>
      </Card>
    </div>
    </>
  );
}
