import { ProgressBar } from 'pixel-retroui';

export default function OnboardingProgress({ step, total, title }) {
  const current = step + 1;
  const progress = (current / total) * 100;
  return (
    <div>
      <p className="text-sm font-semibold text-leaf dark:text-emerald-300" aria-live="polite">
        Step {current} of {total}
        <span className="sr-only">: {title}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${total}: ${title}`}
        className="mt-2"
      >
        <div aria-hidden="true">
          <ProgressBar progress={progress} size="sm" color="#1E5631" borderColor="#000000" />
        </div>
      </div>
    </div>
  );
}
