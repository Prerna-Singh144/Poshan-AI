export default function Dashboard() {
  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <p className="text-slate-600 dark:text-slate-300">Welcome to your PoshanAI dashboard.</p>
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
