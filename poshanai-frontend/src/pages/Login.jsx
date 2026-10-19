import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import logo from '../assets/logo.svg';
import Button from '../components/common/Button.jsx';
import SmoothInput from '../components/ui/SmoothInput.jsx';
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
    <main className="flex min-h-screen items-center justify-center bg-cream p-4 dark:bg-slate-950 sm:p-6">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8"
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
          <SmoothInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <SmoothInput
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          {errors.root?.serverError?.message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {errors.root.serverError.message}
            </p>
          )}
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader size="sm" label="Signing in" className="border-current" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
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
