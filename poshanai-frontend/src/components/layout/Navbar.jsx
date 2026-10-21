import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../common/index.js';
import logo from '../../assets/logo.svg';

const linkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-emerald-50 text-leaf dark:bg-emerald-900/40 dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-50 hover:text-leaf dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-200'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = pathname === '/';

  const closeMenu = () => setMenuOpen(false);
  const homeLinks = (
    <>
      <Link to={isLanding ? '#approach' : '/#approach'} onClick={closeMenu} className={linkClass({ isActive: true })}>Our approach</Link>
      <Link to={isLanding ? '#benefits' : '/#benefits'} onClick={closeMenu} className={linkClass({ isActive: true })}>Why PoshanAI</Link>
    </>
  );
  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? '☀️' : '🌙'}<span className="sr-only">{isDark ? 'Light' : 'Dark'} theme</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-[#f9fbf9]/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2" aria-label="PoshanAI home">
          <img src={logo} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="text-lg font-bold tracking-tight text-[#244b36] dark:text-emerald-300">Poshan<span className="text-orange">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {homeLinks}
          <NavLink to="/food-library" className={linkClass}>Food library</NavLink>
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          {themeButton}
          {user ? <>
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </> : <>
            <NavLink to="/login" className={linkClass}>Sign in</NavLink>
            <NavLink to="/register" className="rounded-lg bg-[#244b36] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#173a2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2">Create account</NavLink>
          </>}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          {themeButton}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg px-3 py-2 text-lg text-[#244b36] hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf dark:text-emerald-200 dark:hover:bg-slate-800"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-main-navigation"
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-main-navigation" className="absolute inset-x-0 top-full border-b border-emerald-900/10 bg-[#f9fbf9] p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {homeLinks}
            <NavLink to="/food-library" onClick={closeMenu} className={linkClass}>Food library</NavLink>
            {user ? <>
              <NavLink to="/dashboard" onClick={closeMenu} className={linkClass}>Dashboard</NavLink>
              <Button variant="ghost" size="sm" onClick={() => { closeMenu(); logout(); }}>Sign out</Button>
            </> : <>
              <NavLink to="/login" onClick={closeMenu} className={linkClass}>Sign in</NavLink>
              <NavLink to="/register" onClick={closeMenu} className="mt-1 rounded-lg bg-[#244b36] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#173a2c]">Create account</NavLink>
            </>}
          </div>
        </nav>
      )}
    </header>
  );
}
