import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, Home, Salad, UserRound, Upload, Users, FlaskConical } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../common/Toast.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

const links = [
  { to: '/', label: 'Back to Home', Icon: ArrowLeft },
  { to: '/dashboard', label: 'Dashboard', Icon: Home },
  { to: '/calorie-tracker', label: 'Calorie tracker', Icon: Activity },
  { to: '/diet-plan', label: 'Basic diet plan', Icon: Salad },
  { to: '/experts', label: 'Connect with experts', Icon: Users },
  { to: '/recommendations', label: 'Recommended tests', Icon: FlaskConical },
  { to: '/profile', label: 'Profile', Icon: UserRound },
  { to: '/upload', label: 'Upload report', Icon: Upload },
];

function AuthenticatedNavbar({ dark, onToggleTheme, onToggleMenu }) {
  const { logout } = useAuth();
  const toast = useToast();
  return (
    <header className="sticky top-0 z-20 border-b-4 border-black bg-white dark:border-black dark:bg-slate-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMenu}
            className="rounded-none border-2 border-black p-2 text-slate-900 shadow-[3px_3px_0px_#000] hover:bg-emerald-50 dark:text-slate-100 md:hidden"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <Link to="/" aria-label="PoshanAI home" className="text-xl font-bold text-leaf dark:text-emerald-300">
            PoshanAI
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="rounded-none border-2 border-black px-3 py-2 text-sm shadow-[3px_3px_0px_#000] hover:bg-emerald-50 dark:hover:bg-slate-800"
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
            className="rounded-none border-2 border-black bg-[#1E5631] px-3 py-2 text-sm font-medium text-white shadow-[3px_3px_0px_#000] hover:bg-emerald-800"
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
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AuthenticatedNavbar
        dark={isDark}
        onToggleTheme={toggleTheme}
        onToggleMenu={() => setMenuOpen((value) => !value)}
      />
      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`${menuOpen ? 'block' : 'hidden'} absolute z-10 min-h-[calc(100vh-4rem)] w-64 border-r-4 border-black bg-[#F9FBF9] p-4 dark:border-black dark:bg-slate-900 md:relative md:block`}
        >
          <nav className="space-y-1" aria-label="Main navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-none border-2 px-3 py-3 text-sm font-medium ${isActive ? 'border-black bg-emerald-100 text-[#1E5631] shadow-[3px_3px_0px_#000] dark:bg-emerald-950 dark:text-emerald-300' : 'border-transparent text-slate-700 hover:border-black hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                <link.Icon size={18} aria-hidden="true" />
                <span>{link.label}</span>
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
