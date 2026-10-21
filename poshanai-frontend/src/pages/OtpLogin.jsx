import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { requestOTP, resetPassword, verifyOTP } from '../api/authApi.js';
import { useAuth } from '../hooks/useAuth.js';

const modes = [
  { value: 'login', label: 'Sign in' },
  { value: 'reset-password', label: 'Reset password' },
  { value: 'verify-email', label: 'Verify email' },
];

const modeCopy = {
  login: { title: 'Sign in with email code', action: 'Send sign-in code' },
  'reset-password': { title: 'Reset your password', action: 'Send reset code' },
  'verify-email': { title: 'Verify your email', action: 'Send verification code' },
};

export default function OtpLogin() {
  const [searchParams] = useSearchParams();
  const initialPurpose = modes.some(({ value }) => value === searchParams.get('purpose'))
    ? searchParams.get('purpose')
    : 'login';
  const [purpose, setPurpose] = useState(initialPurpose);
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithOtp, logout } = useAuth();
  const navigate = useNavigate();

  const changePurpose = (nextPurpose) => {
    setPurpose(nextPurpose);
    setStep('request');
    setOtp('');
    setDevOtp(null);
    setResetToken('');
    setMessage('');
    setError('');
  };

  const sendCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const result = await requestOTP(email.trim(), purpose);
      setDevOtp(result.dev_otp ?? null);
      setStep('verify');
      setMessage(result.message ?? 'If the email is eligible, a code will be sent shortly.');
    } catch (requestError) {
      setError(requestError?.apiError?.message ?? 'Unable to request a code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (purpose === 'login') {
        const result = await loginWithOtp(email.trim(), otp);
        if (result?.requiresTwoFactor) {
          navigate('/two-factor-verify', { replace: true });
          return;
        }
        navigate('/dashboard', { replace: true });
        return;
      }

      const result = await verifyOTP(email.trim(), otp, purpose);
      if (purpose === 'reset-password') {
        setResetToken(result.resetToken);
        setStep('password');
        setMessage('Code verified. Choose a new password.');
        return;
      }

      setStep('done');
      setMessage('Your email is verified.');
    } catch (verificationError) {
      setError(verificationError?.apiError?.message ?? 'That code could not be verified.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNewPassword = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      await logout().catch(() => {});
      setStep('done');
      setMessage('Password updated. Sign in with your new password.');
    } catch (resetError) {
      setError(resetError?.apiError?.message ?? 'Unable to update the password. Request a new code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardClass = 'w-full max-w-md rounded-xl border border-[#e6e4d9] bg-[#fffefa] p-6 shadow-[0_20px_60px_rgba(39,54,45,0.08)] dark:border-slate-700 dark:bg-slate-900 sm:p-9';
  const inputClass = 'w-full rounded-md border border-[#d8d9ce] bg-white px-3.5 py-3 text-[#27362d] outline-none transition placeholder:text-slate-400 focus:border-[#244b36] focus:ring-2 focus:ring-[#244b36]/15 dark:bg-slate-950 dark:text-white';

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f7f1] px-5 py-14 text-[#27362d] dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-20">
      <section aria-labelledby="otp-title" className={cardClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#728f5b] dark:text-emerald-300">
          PoshanAI account security
        </p>
        <h1 id="otp-title" className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#244b36] dark:text-white sm:text-4xl">
          {modeCopy[purpose].title}
        </h1>
        <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-[#f1f2e9] p-1 dark:bg-slate-800" aria-label="Email code purpose">
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => changePurpose(mode.value)}
              aria-pressed={purpose === mode.value}
              className={`rounded-md px-2 py-2 text-xs font-semibold transition sm:text-sm ${purpose === mode.value ? 'bg-white text-[#244b36] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {step === 'request' && (
          <form className="mt-6 space-y-4" onSubmit={sendCode}>
            <label htmlFor="otp-email" className="block text-sm font-medium">Email address</label>
            <input
              id="otp-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full rounded-md bg-[#244b36] hover:bg-[#173a2c]">
              {modeCopy[purpose].action}
            </Button>
          </form>
        )}

        {step === 'verify' && (
          <form className="mt-6 space-y-4" onSubmit={verifyCode}>
            <p className="text-sm leading-6 text-[#58655a] dark:text-slate-300">Enter the six-digit code sent to your email address.</p>
            <label htmlFor="otp-code" className="block text-sm font-medium">Email code</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} text-center text-xl tracking-[0.45em]`}
              placeholder="••••••"
            />
            {import.meta.env.DEV && devOtp && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="status">
                Development code: <strong className="font-mono tracking-widest">{devOtp}</strong>
              </p>
            )}
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full rounded-md bg-[#244b36] hover:bg-[#173a2c]">
              Verify code
            </Button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-sm font-semibold text-[#244b36] underline underline-offset-4 dark:text-emerald-300">
              Change email or resend code
            </button>
          </form>
        )}

        {step === 'password' && (
          <form className="mt-6 space-y-4" onSubmit={saveNewPassword}>
            <label htmlFor="new-password" className="block text-sm font-medium">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
            <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full rounded-md bg-[#244b36] hover:bg-[#173a2c]">
              Update password
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" role="status">
            {message}
            <Link to="/login" className="mt-3 block font-semibold underline underline-offset-4">Continue to sign in</Link>
          </div>
        )}

        {message && step !== 'done' && <p className="mt-4 text-sm text-[#58655a] dark:text-slate-300" role="status">{message}</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{error}</p>}
        <p className="mt-6 text-sm text-[#58655a] dark:text-slate-300">
          <Link className="font-semibold text-[#244b36] underline underline-offset-4 dark:text-emerald-300" to="/login">Back to password sign in</Link>
        </p>
      </section>
    </main>
  );
}
