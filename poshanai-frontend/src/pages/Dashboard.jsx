import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Skeleton } from '../components/common/index.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCachedFetch } from '../hooks/useCachedFetch.js';
import { getReport, reviewReport } from '../api/reportApi.js'; // Added for Report Review
import CalorieTracker from '../components/dashboard/CalorieTracker.jsx';

const REPORTS_URL = '/reports?page=1&limit=50';
const MEAL_PLANS_URL = '/mealplans?page=1&limit=100';
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

function getReports(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reports)) return data.reports;
  return null;
}

function getMealPlans(data) {
  if (Array.isArray(data?.mealPlans)) return data.mealPlans;
  if (Array.isArray(data?.plans)) return data.plans;
  if (Array.isArray(data)) return data;
  return null;
}

function getId(item) {
  const id = item?.id ?? item?._id;
  return typeof id === 'string' ? id : null;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormatter.format(date);
}

function RequestError({ title, message, onRetry }) {
  return (
    <Card className="border-red-200 dark:border-red-900">
      <h3 className="font-semibold text-red-800 dark:text-red-300">{title}</h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-200">{message}</p>
      <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function retryRequest(refetch) {
  refetch().catch(() => {});
}

function StatCard({ label, value, detail, loading, className }) {
  return (
    <Card as="article" className={`dashboard-clay-stat h-full ${className || ''}`}>
      <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</h2>
      {loading ? (
        <Skeleton className="mt-3" width="16" height="8" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      )}
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </Card>
  );
}

function ProfileSummary({ user }) {
  return (
    <Card as="section" aria-labelledby="profile-summary-title" className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="profile-summary-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            Profile
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Account details from your signed-in session.
          </p>
        </div>
        <Link
          to="/profile"
          className="text-sm font-semibold text-leaf underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          View profile
        </Link>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Name
          </dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
            {user?.name || 'Name unavailable'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Email
          </dt>
          <dd className="mt-1 break-all font-medium text-slate-900 dark:text-white">
            {user?.email || 'Email unavailable'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Age
          </dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
            {user?.profile?.age ?? 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Gender
          </dt>
          <dd className="mt-1 capitalize font-medium text-slate-900 dark:text-white">
            {user?.profile?.gender || 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Weight
          </dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
            {user?.profile?.weightKg ? `${user.profile.weightKg} kg` : 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Height
          </dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
            {user?.profile?.heightCm ? `${user.profile.heightCm} cm` : 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Diet type
          </dt>
          <dd className="mt-1 capitalize font-medium text-slate-900 dark:text-white">
            {user?.profile?.dietType || 'Not provided'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Region
          </dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-white">
            {user?.profile?.region || 'Not provided'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function ReportList({ reports, isLoading, error, onRetry }) {
  const navigate = useNavigate();

  return (
    <Card as="section" aria-labelledby="recent-reports-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="recent-reports-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent reports
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Your five most recent uploaded reports.
          </p>
        </div>
        <Link
          to="/upload"
          className="text-sm font-semibold text-leaf underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Upload report
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading recent reports">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <Skeleton width="third" height="5" />
              <Skeleton className="mt-3" width="half" height="4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-5">
          <RequestError
            title="Reports could not be loaded"
            message={error.message || 'Please check your connection and try again.'}
            onRetry={onRetry}
          />
        </div>
      ) : reports === null ? (
        <p className="mt-5 text-sm text-red-700 dark:text-red-300" role="alert">
          The reports service returned data in an unexpected format.
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-5 rounded-xl bg-cream p-5 dark:bg-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            No reports yet. Upload your first blood report.
          </p>
          <Button className="mt-4" size="sm" onClick={() => navigate('/upload')}>
            Upload a report
          </Button>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {reports.slice(0, 5).map((report, index) => {
            const id = getId(report);
            const status = report.ocrStatus || 'status unavailable';
            return (
              <li key={id || `${report.uploadedAt || 'report'}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Blood report · {formatDate(report.uploadedAt)}
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">
                    Processing status: {status}
                  </p>
                </div>
                {id && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Report ID: {id.slice(-6)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: reportData,
    isLoading: reportsLoading,
    error: reportsError,
    refetch: refetchReports,
  } = useCachedFetch(REPORTS_URL);
  const {
    data: mealPlanData,
    isLoading: mealPlansLoading,
    error: mealPlansError,
    refetch: refetchMealPlans,
  } = useCachedFetch(MEAL_PLANS_URL);

  const reports = getReports(reportData);
  const mealPlans = getMealPlans(mealPlanData);
  const mealPlansFormatError = !mealPlansLoading && !mealPlansError && mealPlans === null;
  const activeMealPlans = mealPlans?.filter((plan) => plan.status === 'active') ?? [];
  const latestMealPlanId = mealPlans?.map(getId).find(Boolean);
  const hasMoreMealPlans = (mealPlanData?.pagination?.pages ?? 1) > 1;

  // --- State for Report Review (from Member 2) ---
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const handleOpenReport = async (report) => {
    try {
      const data = await getReport(report.id ?? report._id);
      setSelectedReport(data.report ?? data);
    } catch {
      setReviewError('Could not load report values.');
    }
  };

  const handleSubmitReview = async (reviewStatus) => {
    setSavingReview(true);
    try {
      const data = await reviewReport(selectedReport.id || selectedReport._id, reviewStatus, selectedReport.extractedValues);
      const reviewed = data.report ?? data;
      setSelectedReport(reviewed);
      refetchReports(); // Refresh list to show updated status
    } catch {
      setReviewError('Could not save report review.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleInputChange = (index, newValue) => {
    setSelectedReport((current) => ({
      ...current,
      extractedValues: current.extractedValues.map((item, itemIndex) =>
        itemIndex === index ? { ...item, value: Number(newValue) } : item
      ),
    }));
  };

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf dark:text-emerald-300">
          Your nutrition workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          Welcome, {user?.name || 'there'}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Review your account, reports, and meal plans in one place.
        </p>
      </motion.header>

      <section aria-label="Nutrition overview" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <StatCard
          label="Reports"
          className="lg:col-span-5"
          value={reportsLoading ? null : reports?.length ?? '—'}
          detail="Reports in your account (up to 50)."
          loading={reportsLoading}
        />
        {mealPlansError || mealPlansFormatError ? (
          <RequestError
            title="Meal-plan data unavailable"
            message={mealPlansError?.message || 'The meal-plans service returned data in an unexpected format.'}
            onRetry={() => retryRequest(refetchMealPlans)}
          />
        ) : (
          <StatCard
            className="lg:col-span-7"
            label="Active meal plans"
            value={mealPlansLoading ? null : mealPlans ? activeMealPlans.length : '—'}
            detail={hasMoreMealPlans ? 'Active plans on the first page; additional plans exist.' : 'Plans currently marked active.'}
            loading={mealPlansLoading}
          />
        )}
      </section>

      <div className="dashboard-bento-feature"><CalorieTracker /></div>

      <section aria-label="Profile and reports" className="grid gap-5 lg:grid-cols-7">
        <div className="lg:col-span-3"><ProfileSummary user={user} /></div>
        <div className="lg:col-span-4"><ReportList reports={reports} isLoading={reportsLoading} error={reportsError} onRetry={() => retryRequest(refetchReports)} /></div>
      </section>

      {/* --- Report Review Section (Integrated from Member 2) --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Report review</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm extracted lab values before generating a meal plan.</p>
        {reviewError && <p role="alert" className="mt-3 text-sm text-red-600">{reviewError}</p>}
        
        {reports && reports.filter((r) => r.ocrStatus === 'completed').length > 0 ? (
          <ul className="mt-4 space-y-2">
            {reports.filter((report) => report.ocrStatus === 'completed').map((report) => (
              <li key={report.id ?? report._id} className="flex items-center justify-between gap-3 rounded border p-3 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300">Report · {report.reviewStatus ?? 'pending review'}</span>
                <button className="text-leaf underline" onClick={() => handleOpenReport(report)}>Review values</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No completed reports available for review.</p>
        )}

        {selectedReport && (
          <div className="mt-6 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Extracted values</h3>
            {selectedReport.extractedValues?.map((value, index) => (
              <label key={`${value.nutrient}-${index}`} className="grid gap-1 text-sm text-slate-700 dark:text-slate-300">
                {value.nutrient} ({value.unit ?? 'unit unavailable'})
                <input
                  type="number"
                  step="any"
                  value={value.value}
                  onChange={(event) => handleInputChange(index, event.target.value)}
                  className="rounded border p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            ))}
            <div className="flex gap-3 mt-4">
              <button disabled={savingReview} className="rounded bg-leaf px-4 py-2 text-white disabled:opacity-50" onClick={() => handleSubmitReview('confirmed')}>
                {savingReview ? 'Saving...' : 'Confirm values'}
              </button>
              <button disabled={savingReview} className="rounded border px-4 py-2 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300" onClick={() => handleSubmitReview('corrected')}>
                Save corrections
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="text-xl font-semibold text-slate-900 dark:text-white">Quick actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card as="article" className="h-full">
            <h3 className="font-semibold text-slate-900 dark:text-white">Upload a report</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Add a PDF or image report to your account.</p>
            <Button as={Link} to="/upload" className="mt-4" size="sm">Upload report</Button>
          </Card>

          <Card as="article" className="h-full">
            <h3 className="font-semibold text-slate-900 dark:text-white">View meal plans</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {latestMealPlanId ? 'Open your latest meal plan.' : 'No meal plan is available yet. Upload a report to get started.'}
            </p>
            <Button onClick={() => navigate(latestMealPlanId ? `/meal-plan/${encodeURIComponent(latestMealPlanId)}` : '/upload')} className="mt-4" size="sm" variant="secondary">
              {latestMealPlanId ? 'View latest plan' : 'Upload a report'}
            </Button>
          </Card>

          <Card as="article" className="h-full">
            <h3 className="font-semibold text-slate-900 dark:text-white">Complete your profile</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Review your account details and profile options.</p>
            <Button className="mt-4" size="sm" variant="secondary" onClick={() => navigate('/profile')}>View profile</Button>
          </Card>
        </div>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        PoshanAI provides nutrition awareness and food suggestions. It does not diagnose or replace advice from a qualified healthcare professional.
      </p>
    </motion.div>
  );
}
