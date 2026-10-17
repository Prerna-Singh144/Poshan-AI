import { forwardRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import logo from '../assets/logo.svg';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';

const requiredNumber = (label, min, max, integer = false) =>
  z.preprocess(
    (value) => (value === '' || Number.isNaN(value) ? undefined : Number(value)),
    z
      .number({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be no more than ${max}.`)
      .refine((value) => !integer || Number.isInteger(value), `${label} must be a whole number.`),
  );

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
    age: requiredNumber('Age', 13, 100, true),
    gender: z.string().min(1, 'Please select your gender.'),
    weightKg: requiredNumber('Weight', 20, 200),
    heightCm: requiredNumber('Height', 100, 250),
    dietType: z.string().min(1, 'Please select your diet type.'),
    region: z
      .string()
      .trim()
      .min(2, 'Enter your region or state.')
      .max(100, 'Region must be 100 characters or fewer.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const selectClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-900';

const SelectField = forwardRef(function SelectField(
  { label, error, children, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <label
        htmlFor={props.id}
        className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100"
      >
        {label}
      </label>
      <select
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={`${selectClassName} ${error ? 'border-red-500' : ''}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
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
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: '',
      gender: '',
      weightKg: '',
      heightCm: '',
      dietType: '',
      region: '',
    },
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
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-8 dark:bg-slate-950 sm:px-6">
      <section
        aria-labelledby="register-title"
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-3" aria-label="PoshanAI home">
          <img src={logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
          <span className="text-xl font-bold text-leaf dark:text-emerald-300">PoshanAI</span>
        </Link>
        <h1 id="register-title" className="text-3xl font-bold text-slate-900 dark:text-white">
          Create your account
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Create an account and tell us a little about your nutrition preferences.
        </p>

        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          The current registration API saves your name, email, and password. Profile details entered
          below are not saved yet because profile storage is not implemented.
        </p>

        <form
          className="mt-6 space-y-7"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Create account"
        >
          <fieldset className="space-y-4">
            <legend className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              Account details
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              About you
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Age"
                type="number"
                inputMode="numeric"
                min={13}
                max={100}
                step={1}
                {...registerField('age', { valueAsNumber: true })}
                error={errors.age?.message}
              />
              <SelectField
                id="gender"
                label="Gender"
                defaultValue=""
                {...registerField('gender')}
                error={errors.gender?.message}
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </SelectField>
              <Input
                label="Weight (kg)"
                type="number"
                inputMode="decimal"
                min={20}
                max={200}
                step="any"
                {...registerField('weightKg', { valueAsNumber: true })}
                error={errors.weightKg?.message}
              />
              <Input
                label="Height (cm)"
                type="number"
                inputMode="decimal"
                min={100}
                max={250}
                step="any"
                {...registerField('heightCm', { valueAsNumber: true })}
                error={errors.heightCm?.message}
              />
              <SelectField
                id="dietType"
                label="Diet type"
                defaultValue=""
                {...registerField('dietType')}
                error={errors.dietType?.message}
              >
                <option value="" disabled>
                  Select diet type
                </option>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-vegetarian</option>
                <option value="vegan">Vegan</option>
              </SelectField>
              <Input
                label="Region or state"
                type="text"
                autoComplete="address-level1"
                placeholder="For example, Uttarakhand"
                maxLength={100}
                {...registerField('region')}
                error={errors.region?.message}
              />
            </div>
          </fieldset>

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
            loading={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          Already registered?{' '}
          <Link className="font-medium text-leaf underline dark:text-emerald-300" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
