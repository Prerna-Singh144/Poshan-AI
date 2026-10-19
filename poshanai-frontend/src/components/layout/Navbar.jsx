import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../common/index.js';
import logo from '../../assets/logo.svg';

const linkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-emerald-50 text-leaf dark:bg-emerald-900/40 dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-50 hover:text-leaf dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-200'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem('poshanai-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('poshanai-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={user ? '/dashboard' : '/'} className="flex shrink-0 items-center gap-2" aria-label="PoshanAI home">
          <img src={logo} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="font-heading text-lg font-bold tracking-tight text-leaf">Poshan<span className="text-orange">AI</span></span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button type="button" onClick={() => setIsDark((value) => !value)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
            {isDark ? '☀️' : '🌙'}<span className="sr-only">{isDark ? 'Light' : 'Dark'} theme</span>
          </button>
          {user ? <>
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </> : <>
            <NavLink to="/login" className={linkClass}>Sign in</NavLink>
            <NavLink to="/register" className="rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-white hover:bg-leaf-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2">Create account</NavLink>
          </>}
        </nav>
      </div>
    </header>
  );
}
