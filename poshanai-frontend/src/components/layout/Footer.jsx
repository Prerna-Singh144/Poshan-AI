import logo from '../../assets/logo.svg';

export default function Footer() {
  return (
    <footer className="border-t border-emerald-100 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-5 text-sm text-slate-500 dark:text-slate-400 sm:px-6">
        <img src={logo} alt="" className="h-6 w-6 rounded-full object-cover" />
        <span>© {new Date().getFullYear()} PoshanAI · Nutrition awareness and food suggestions</span>
      </div>
    </footer>
  );
}
