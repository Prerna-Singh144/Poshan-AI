import { lazy, Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
// Keep RetroUI components scoped to onboarding and authentication flows.
import { Button as RetroButton, Input as RetroInput } from 'pixel-retroui';
import logo from '../assets/logo.svg';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../hooks/useAuth.js';
import '../components/ui/threeui/threeui.css';

const WarpFieldBackground = lazy(() => import('../components/ui/threeui/WarpFieldBackground.jsx'));

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (credentials) => {
    clearErrors('root.serverError');
    try {
      await login(credentials);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error?.apiError?.message || error?.message || 'Unable to sign in. Please try again.';
      setError('root.serverError', { type: 'server', message });
      toast(message, 'error');
    }
  };

  return (
    <main className="font-minecraft relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-cream p-4 dark:bg-slate-950 sm:p-6">
      <div className="auth-warp-background" aria-hidden="true">
        <Suspense fallback={null}><WarpFieldBackground variant="keycaps" speed={0.45} streakOpacity={0.22} tileOpacity={0.55} fov={75} hue={0} saturation={1.25} brightness={0.8} /></Suspense>
      </div>
      <section
        aria-labelledby="login-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 sm:p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-3" aria-label="PoshanAI home">
          <img src={logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
          <span className="text-xl font-bold text-leaf dark:text-emerald-300">PoshanAI</span>
        </Link>
        <h1 id="login-title" className="text-3xl font-bold text-slate-900 dark:text-white">
          Sign in
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Sign in to continue to PoshanAI.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Sign in"
        >
          <div className="w-full">
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100">
              Email
            </label>
            <RetroInput
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
              bg="#FFFFFF"
              textColor="#1E5631"
              borderColor={errors.email ? '#DC2626' : '#000000'}
              className="w-[calc(100%-0.5rem)]"
            />
            {errors.email?.message && (
              <p id="login-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="w-full">
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100">
              Password
            </label>
            <RetroInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
              bg="#FFFFFF"
              textColor="#1E5631"
              borderColor={errors.password ? '#DC2626' : '#000000'}
              className="w-[calc(100%-0.5rem)]"
            />
            {errors.password?.message && (
              <p id="login-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          {errors.root?.serverError?.message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {errors.root.serverError.message}
            </p>
          )}
          <RetroButton
            bg="#1E5631"
            textColor="#FFFFFF"
            borderColor="#000000"
            shadow="#000000"
            className="mx-0 my-0 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader size="sm" label="Signing in" className="border-current" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </RetroButton>
        </form>
        <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-leaf underline dark:text-emerald-300" to="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
