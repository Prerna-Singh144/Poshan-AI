import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../common/Toast.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/calorie-tracker', label: 'Calorie tracker' },
  { to: '/profile', label: 'Profile' },
  { to: '/upload', label: 'Upload report' },
];

function AuthenticatedNavbar({ dark, onToggleTheme, onToggleMenu }) {
  const { logout } = useAuth();
  const toast = useToast();
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMenu}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <Link to="/dashboard" className="text-xl font-bold text-leaf dark:text-emerald-300">
            PoshanAI
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={() =>
              logout().catch(() =>
                toast(
                  'Your local session ended, but the server session could not be cleared.',
                  'error',
                ),
              )
            }
            className="rounded-lg bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="flex-1"><Outlet /></div>
      <Footer />
    </div>
  );
}

export default function Layout({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('poshanai-theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('poshanai-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-cream text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AuthenticatedNavbar
        dark={dark}
        onToggleTheme={() => setDark((value) => !value)}
        onToggleMenu={() => setMenuOpen((value) => !value)}
      />
      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`${menuOpen ? 'block' : 'hidden'} absolute z-10 min-h-[calc(100vh-4rem)] w-64 border-r border-emerald-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:relative md:block`}
        >
          <nav className="space-y-1" aria-label="Main navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium ${isActive ? 'bg-emerald-50 text-leaf dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {children ?? <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
