import { useEffect, useState } from 'react';
import { getReports, getReport, reviewReport } from '../api/reportApi.js';

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getReports().then(setReports).catch(() => setError('Could not load reports.')); }, []);
  async function openReport(report) {
    try {
      const data = await getReport(report.id ?? report._id);
      setSelected(data.report ?? data);
    } catch { setError('Could not load report values.'); }
  }
  async function submitReview(reviewStatus) {
    setSaving(true);
    try {
      const data = await reviewReport(selected.id, reviewStatus, selected.extractedValues);
      const reviewed = data.report ?? data;
      setSelected(reviewed);
      setReports((items) => items.map((item) => (item.id === reviewed.id ? reviewed : item)));
    } catch { setError('Could not save report review.'); }
    finally { setSaving(false); }
  }
  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <p className="text-slate-600 dark:text-slate-300">Welcome to your PoshanAI dashboard.</p>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Report review</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm extracted lab values before generating a meal plan.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <ul className="mt-4 space-y-2">{reports.filter((report) => report.ocrStatus === 'completed').map((report) => (
          <li key={report.id ?? report._id} className="flex items-center justify-between gap-3 rounded border p-3">
            <span>Report · {report.reviewStatus ?? 'pending review'}</span>
            <button className="text-leaf underline" onClick={() => openReport(report)}>Review values</button>
          </li>
        ))}</ul>
        {selected && <div className="mt-4 space-y-3">
          <h3 className="font-semibold">Extracted values</h3>
          {selected.extractedValues?.map((value, index) => <label key={`${value.nutrient}-${index}`} className="grid gap-1 text-sm">
            {value.nutrient} ({value.unit ?? 'unit unavailable'})
            <input type="number" step="any" value={value.value} onChange={(event) => setSelected((current) => ({ ...current, extractedValues: current.extractedValues.map((item, itemIndex) => itemIndex === index ? { ...item, value: Number(event.target.value) } : item) }))} className="rounded border p-2 text-slate-900" />
          </label>)}
          <div className="flex gap-3">
            <button disabled={saving} className="rounded bg-leaf px-4 py-2 text-white disabled:opacity-50" onClick={() => submitReview('confirmed')}>Confirm values</button>
            <button disabled={saving} className="rounded border px-4 py-2 disabled:opacity-50" onClick={() => submitReview('corrected')}>Save corrections</button>
          </div>
        </div>}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['Nutrition overview', 'Recent reports', 'Meal plans'].map((title) => (
          <article
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Your {title.toLowerCase()} will appear here.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
