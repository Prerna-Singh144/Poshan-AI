import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import logo from '../assets/logo.svg';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(80, 'Name must be 80 characters or fewer.'),
    email: z
      .string()
      .trim()
      .email('Enter a valid email address.')
      .max(254, 'Email must be 254 characters or fewer.')
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export default function Register() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const {
    register: registerField,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ name, email, password }) => {
    clearErrors('root.serverError');

    try {
      const session = await createAccount({ name, email, password });
      if (!session.isAuthenticated) {
        setError('root.serverError', {
          type: 'server',
          message: 'Your account was created, but sign-in could not be completed. Please log in.',
        });
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError('root.serverError', {
        type: 'server',
        message:
          error?.apiError?.message ||
          error?.message ||
          'Unable to create your account. Please try again.',
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-4 dark:bg-slate-950 sm:p-6">
      <section
        aria-labelledby="register-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-3" aria-label="PoshanAI home">
          <img src={logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
          <span className="text-xl font-bold text-leaf dark:text-emerald-300">PoshanAI</span>
        </Link>
        <h1 id="register-title" className="text-3xl font-bold text-slate-900 dark:text-white">
          Create your account
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Register to continue to PoshanAI.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Create account"
        >
          <Input
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            maxLength={80}
            {...registerField('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            {...registerField('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            helperText="Use 8 to 128 characters."
            {...registerField('password')}
            error={errors.password?.message}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...registerField('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          {errors.root?.serverError?.message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {errors.root.serverError.message}
            </p>
          )}

          <Button className="w-full" type="submit" loading={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          This step saves your name, email, and password. Profile details will be added when profile
          saving is available.
        </p>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Already registered?{' '}
          <Link className="font-medium text-leaf underline dark:text-emerald-300" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
