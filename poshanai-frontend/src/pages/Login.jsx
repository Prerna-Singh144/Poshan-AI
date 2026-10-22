import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { Button as RetroButton } from 'pixel-retroui';
import SmoothInput from '../components/ui/SmoothInput.jsx';
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
      const result = await login(credentials);
      if (result?.requiresTwoFactor) {
        navigate('/two-factor-verify', { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error?.apiError?.message || error?.message || 'Unable to sign in. Please try again.';
      setError('root.serverError', { type: 'server', message });
      toast(message, 'error');
    }
  };

  return (
    <main className="retro-auth flex min-h-[70vh] items-center justify-center bg-[#f8f7f1] px-5 py-14 text-[#27362d] dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-20">
      <section
        aria-labelledby="login-title"
        className="retro-auth-card w-full max-w-md p-6 sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#728f5b] dark:text-emerald-300">
          Nutrition, made personal
        </p>
        <h1
          id="login-title"
          className="mt-3 font-minecraft text-3xl font-bold tracking-tight text-[#1E5631] dark:text-white sm:text-4xl"
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
          <SmoothInput
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            error={errors.email?.message}
            className="font-minecraft"
          />
          <SmoothInput
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
            className="font-minecraft"
          />
          {errors.root?.serverError?.message && (
            <p
              role="alert"
              className="border-4 border-black bg-red-100 p-3 text-sm text-red-800"
            >
              {errors.root.serverError.message}
            </p>
          )}
          <RetroButton
            bg="#1E5631"
            textColor="#FFFFFF"
            borderColor="#000000"
            shadow="#000000"
            className="mx-0 my-0 mt-1 w-full px-5 py-3 font-minecraft"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader size="sm" label="Signing in" className="border-current" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </RetroButton>
        </form>
        <p className="mt-6 text-sm text-[#58655a] dark:text-slate-300">
          <Link
            className="font-semibold text-[#244b36] underline underline-offset-4 hover:text-[#173a2c] dark:text-emerald-300 dark:hover:text-emerald-200"
            to="/login-otp?purpose=login"
          >
            Sign in with OTP
          </Link>
        </p>
        <p className="mt-3 text-sm text-[#58655a] dark:text-slate-300">
          <Link
            className="font-semibold text-[#244b36] underline underline-offset-4 hover:text-[#173a2c] dark:text-emerald-300 dark:hover:text-emerald-200"
            to="/login-otp?purpose=reset-password"
          >
            Forgot password?
          </Link>
        </p>
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
