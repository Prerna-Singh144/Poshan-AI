import heroFallback from '../../assets/hero-fallback.png';

export default function HeroFallback({ loading = false }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <img src={heroFallback} alt="Illustrated preview of the PoshanAI nutrition dashboard" className="h-full w-full object-cover" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/5 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200" role="status" aria-live="polite">
            <span className="size-4 animate-spin rounded-full border-2 border-emerald-700 border-r-transparent" aria-hidden="true" />
            Loading 3D scene
          </div>
        </div>
      )}
    </div>
  );
}
