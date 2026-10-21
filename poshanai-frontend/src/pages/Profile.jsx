import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { fetchProfile, updateProfile } from '../store/slices/userSlice.js';
import { Button, Card, Modal, Skeleton, useToast } from '../components/common/index.js';
import { useAuth } from '../hooks/useAuth.js';

function SecuritySettings({ profile }) {
  const { user, setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor } = useAuth();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const [setup, setSetup] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const enabled = user?.twoFactorEnabled ?? profile?.twoFactorEnabled ?? false;

  const closeDialog = () => {
    setDialog(null);
    setSetup(null);
    setBackupCodes([]);
    setCode('');
    setPassword('');
    setError('');
  };

  const beginSetup = async () => {
    setError('');
    setSaving(true);
    try {
      setSetup(await setupTwoFactor());
      setDialog('setup');
    } catch (setupError) {
      const message = setupError?.apiError?.message || setupError?.message || 'Could not start two-factor setup.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const codes = await verifyTwoFactorSetup(setup.secret, code);
      setBackupCodes(codes);
      setSetup(null);
      setCode('');
      toast('Two-factor authentication enabled.', 'success');
    } catch (verifyError) {
      const message = verifyError?.apiError?.message || verifyError?.message || 'Could not verify the authenticator code.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDisable = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await disableTwoFactor(password, code);
      toast('Two-factor authentication disabled.', 'success');
      closeDialog();
    } catch (disableError) {
      const message = disableError?.apiError?.message || disableError?.message || 'Could not disable two-factor authentication.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="mt-8 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" aria-labelledby="security-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="security-title" className="text-xl font-semibold text-slate-900 dark:text-white">Security</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Authenticator-based two-factor sign-in is {enabled ? 'enabled' : 'not enabled'}.</p>
          </div>
          {enabled
            ? <Button type="button" variant="secondary" onClick={() => { setError(''); setDialog('disable'); }}>Disable 2FA</Button>
            : <Button type="button" loading={saving} onClick={beginSetup}>Enable 2FA</Button>}
        </div>
        {error && !dialog && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      </section>

      <Modal
        isOpen={Boolean(dialog)}
        onClose={closeDialog}
        title={backupCodes.length ? 'Save your backup codes' : dialog === 'disable' ? 'Disable two-factor authentication' : 'Enable two-factor authentication'}
        className="max-w-xl"
      >
        {backupCodes.length > 0 ? (
          <div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Store these codes somewhere private. Each code can be used once if you cannot access your authenticator. They will not be shown again.</p>
            <ul className="my-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-4 font-mono text-sm dark:bg-slate-800">
              {backupCodes.map((backupCode) => <li key={backupCode} className="rounded bg-white px-3 py-2 text-center dark:bg-slate-900">{backupCode}</li>)}
            </ul>
            <Button type="button" className="w-full" onClick={closeDialog}>I’ve saved these codes</Button>
          </div>
        ) : dialog === 'setup' && setup ? (
          <>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Scan this QR code with Google Authenticator or another compatible authenticator app. Then enter its current six-digit code to confirm setup.</p>
            <img src={setup.qrCode} alt="QR code for PoshanAI two-factor setup" className="mx-auto my-5 h-56 w-56 rounded-xl bg-white p-3" />
            <p className="break-all rounded-lg bg-slate-100 p-3 text-center font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">Manual setup key: {setup.secret}</p>
            <form onSubmit={confirmSetup} className="mt-5 space-y-4">
              <label htmlFor="setup-totp-code" className="block text-sm font-medium">Authenticator code</label>
              <input id="setup-totp-code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-green-200 px-3 py-3 text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800" />
              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
              <Button type="submit" loading={saving} disabled={code.length !== 6} className="w-full">Verify and enable</Button>
            </form>
          </>
        ) : (
          <form onSubmit={confirmDisable} className="space-y-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Confirm your password and enter a fresh authenticator code to disable two-factor sign-in.</p>
            <label htmlFor="disable-2fa-password" className="block text-sm font-medium">Password</label>
            <input id="disable-2fa-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-green-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800" />
            <label htmlFor="disable-2fa-code" className="block text-sm font-medium">Authenticator code</label>
            <input id="disable-2fa-code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-green-200 px-3 py-3 text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800" />
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <Button type="submit" loading={saving} disabled={password.length < 8 || code.length !== 6} className="w-full">Confirm and disable</Button>
          </form>
        )}
      </Modal>
    </>
  );
}

function ProfileEditor({ profile }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const loading = useAppSelector((state) => state.user.loading);
  const [form, setForm] = useState(() => ({
    name: profile.name ?? '', age: profile.profile?.age ?? '', gender: profile.profile?.gender ?? '',
    weightKg: profile.profile?.weightKg ?? '', heightCm: profile.profile?.heightCm ?? '',
    activityLevel: profile.profile?.activityLevel ?? 'moderate', dietType: profile.profile?.dietType ?? 'veg',
    region: profile.profile?.region ?? '',
  }));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const profileUpdate = Object.fromEntries(Object.entries({
      age: form.age === '' ? undefined : Number(form.age), gender: form.gender || undefined,
      weightKg: form.weightKg === '' ? undefined : Number(form.weightKg),
      heightCm: form.heightCm === '' ? undefined : Number(form.heightCm),
      activityLevel: form.activityLevel, dietType: form.dietType, region: form.region || undefined,
    }).filter(([, value]) => value !== undefined));
    try {
      await dispatch(updateProfile({ name: form.name, profile: profileUpdate })).unwrap();
      toast('Profile saved.', 'success');
    } catch (saveError) {
      toast(saveError || 'Could not save your profile.', 'error');
    }
  };
  const fields = [
    ['age', 'Age', 'number'], ['gender', 'Gender', 'gender'], ['weightKg', 'Weight (kg)', 'number'],
    ['heightCm', 'Height (cm)', 'number'], ['activityLevel', 'Activity level', 'activity'], ['dietType', 'Diet type', 'diet'], ['region', 'Region', 'text'],
  ];
  const options = {
    gender: [['male', 'Male'], ['female', 'Female'], ['other', 'Other']],
    activity: [['sedentary', 'Sedentary'], ['moderate', 'Moderate'], ['active', 'Active']],
    diet: [['veg', 'Vegetarian'], ['non-veg', 'Non-vegetarian'], ['vegan', 'Vegan'], ['eggetarian', 'Eggetarian']],
  };
  return (
    <Card as="section" className="mx-auto max-w-3xl" aria-labelledby="profile-title">
      <p className="text-sm font-semibold uppercase tracking-wider text-leaf">Your account</p>
      <h1 id="profile-title" className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">Name<input required minLength="2" maxLength="80" value={form.name} onChange={(event) => update('name', event.target.value)} className="mt-1 w-full rounded-xl border border-green-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800" /></label>
        {fields.map(([key, label, type]) => <label key={key} className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}{options[type] ? <select value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-xl border border-green-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800"><option value="">Select</option>{options[type].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select> : <input type={type} min={key === 'age' ? 13 : key === 'weightKg' ? 20 : key === 'heightCm' ? 100 : undefined} max={key === 'age' ? 100 : key === 'weightKg' ? 200 : key === 'heightCm' ? 250 : undefined} value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-xl border border-green-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800" />}</label>)}
        <div className="sm:col-span-2"><Button type="submit" loading={loading} className="w-full sm:w-auto">{loading ? 'Saving…' : 'Save profile'}</Button></div>
      </form>
      <SecuritySettings profile={profile} />
    </Card>
  );
}

export default function Profile() {
  const dispatch = useAppDispatch();
  const { profile, loading, error } = useAppSelector((state) => state.user);
  useEffect(() => { if (!profile) dispatch(fetchProfile()); }, [dispatch, profile]);
  if (profile) return <ProfileEditor key={profile.id} profile={profile} />;
  if (error) return <Card role="alert" className="mx-auto max-w-3xl"><p>Profile details could not be loaded.</p><Button className="mt-3" onClick={() => dispatch(fetchProfile())}>Try again</Button></Card>;
  return <Card className="mx-auto max-w-3xl space-y-4"><Skeleton width="half" height="8" />{[0, 1, 2].map((key) => <Skeleton key={key} height="10" />)}{!loading && <span className="sr-only">Loading profile</span>}</Card>;
}
