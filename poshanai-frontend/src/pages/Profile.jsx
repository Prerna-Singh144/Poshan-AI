import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { fetchProfile, updateProfile } from '../store/slices/userSlice.js';
import { Button, Card, Skeleton, useToast } from '../components/common/index.js';

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
