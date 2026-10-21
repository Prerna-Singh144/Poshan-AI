import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useAuth } from '../hooks/useAuth.js';

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
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f7f1] px-5 py-14 text-[#27362d] dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-20">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-xl border border-[#e6e4d9] bg-[#fffefa] p-6 shadow-[0_20px_60px_rgba(39,54,45,0.08)] dark:border-slate-700 dark:bg-slate-900 sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#728f5b] dark:text-emerald-300">
          Nutrition, made personal
        </p>
        <h1
          id="login-title"
          className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#244b36] dark:text-white sm:text-4xl"
        >
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#58655a] dark:text-slate-300">
          Sign in to continue to PoshanAI.
        </p>
        <form
          className="mt-7 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Sign in"
        >
          <div className="w-full">
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-[#27362d] dark:text-slate-100"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
              className={`w-full rounded-md border bg-white px-3.5 py-3 text-[#27362d] outline-none transition placeholder:text-slate-400 focus:border-[#244b36] focus:ring-2 focus:ring-[#244b36]/15 dark:bg-slate-950 dark:text-white ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-[#d8d9ce]'}`}
            />
            {errors.email?.message && (
              <p id="login-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="w-full">
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-[#27362d] dark:text-slate-100"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
              className={`w-full rounded-md border bg-white px-3.5 py-3 text-[#27362d] outline-none transition placeholder:text-slate-400 focus:border-[#244b36] focus:ring-2 focus:ring-[#244b36]/15 dark:bg-slate-950 dark:text-white ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-[#d8d9ce]'}`}
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
          <Button
            variant="primary"
            size="lg"
            className="mt-1 w-full rounded-md bg-[#244b36] text-sm hover:bg-[#173a2c] focus-visible:ring-[#244b36] dark:bg-emerald-700 dark:hover:bg-emerald-600"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader size="sm" label="Signing in" className="border-current" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-[#58655a] dark:text-slate-300">
          Don&apos;t have an account?{' '}
          <Link
            className="font-semibold text-[#244b36] underline underline-offset-4 hover:text-[#173a2c] dark:text-emerald-300 dark:hover:text-emerald-200"
            to="/register"
          >
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
